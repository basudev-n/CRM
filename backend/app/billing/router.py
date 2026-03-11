from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional
import hmac
import hashlib
import json

from fastapi import APIRouter, Depends, HTTPException, Request, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.core.auth import get_current_user
from app import models
from app.models import User
from app.config import settings

router = APIRouter(prefix="/billing", tags=["billing"])

# Plan configuration
PLANS = {
    "starter": {
        "name": "Starter",
        "max_users": 5,
        "max_projects": 2,
        "price_monthly": 99900,  # ₹999 in paise
        "price_yearly": 959900,  # ₹9,599 (20% discount)
        "razorpay_plan_id_monthly": settings.RAZORPAY_PLAN_STARTER_MONTHLY if hasattr(settings, 'RAZORPAY_PLAN_STARTER_MONTHLY') else None,
        "razorpay_plan_id_yearly": settings.RAZORPAY_PLAN_STARTER_YEARLY if hasattr(settings, 'RAZORPAY_PLAN_STARTER_YEARLY') else None,
    },
    "growth": {
        "name": "Growth",
        "max_users": 20,
        "max_projects": 10,
        "price_monthly": 79900,  # ₹799/user in paise
        "price_yearly": 767000,  # ₹7,670/user (20% discount)
        "razorpay_plan_id_monthly": settings.RAZORPAY_PLAN_GROWTH_MONTHLY if hasattr(settings, 'RAZORPAY_PLAN_GROWTH_MONTHLY') else None,
        "razorpay_plan_id_yearly": settings.RAZORPAY_PLAN_GROWTH_YEARLY if hasattr(settings, 'RAZORPAY_PLAN_GROWTH_YEARLY') else None,
    },
    "scale": {
        "name": "Scale",
        "max_users": 50,
        "max_projects": -1,  # Unlimited
        "price_monthly": 64900,  # ₹649/user in paise
        "price_yearly": 623000,  # ₹6,230/user (20% discount)
        "razorpay_plan_id_monthly": settings.RAZORPAY_PLAN_SCALE_MONTHLY if hasattr(settings, 'RAZORPAY_PLAN_SCALE_MONTHLY') else None,
        "razorpay_plan_id_yearly": settings.RAZORPAY_PLAN_SCALE_YEARLY if hasattr(settings, 'RAZORPAY_PLAN_SCALE_YEARLY') else None,
    },
    "enterprise": {
        "name": "Enterprise",
        "max_users": -1,  # Unlimited
        "max_projects": -1,  # Unlimited
        "price_monthly": 0,  # Custom
        "price_yearly": 0,  # Custom
        "razorpay_plan_id_monthly": None,
        "razorpay_plan_id_yearly": None,
    },
}


class CreateSubscriptionRequest(BaseModel):
    plan: str
    billing_cycle: str = "monthly"  # monthly or yearly


class RazorpayWebhookPayload(BaseModel):
    event: str
    payload: dict


def get_user_org(db: Session, user: User):
    membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == user.id,
        models.OrgMembership.is_active == True
    ).first()
    return membership.organisation if membership else None


def get_razorpay_client():
    """Get Razorpay client if configured."""
    try:
        import razorpay
        key_id = getattr(settings, 'RAZORPAY_KEY_ID', None)
        key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', None)
        if key_id and key_secret:
            return razorpay.Client(auth=(key_id, key_secret))
    except ImportError:
        pass
    return None


@router.get("/plans")
def get_plans(current_user: User = Depends(get_current_user)):
    """Get available subscription plans."""
    plans = []
    for key, plan in PLANS.items():
        plans.append({
            "id": key,
            "name": plan["name"],
            "max_users": plan["max_users"],
            "max_projects": plan["max_projects"],
            "price_monthly": plan["price_monthly"] / 100,  # Convert paise to rupees
            "price_yearly": plan["price_yearly"] / 100,
            "features": get_plan_features(key),
        })
    return {"plans": plans}


def get_plan_features(plan_id: str) -> list:
    """Get features list for a plan."""
    base_features = [
        "Lead management",
        "Contact management",
        "Pipeline tracking",
        "Task management",
        "Site visits scheduling",
        "Basic reports",
    ]
    
    if plan_id == "starter":
        return base_features + ["Up to 5 users", "2 projects", "Email support"]
    elif plan_id == "growth":
        return base_features + [
            "Up to 20 users",
            "10 projects",
            "Finance module",
            "Custom reports",
            "Priority support",
        ]
    elif plan_id == "scale":
        return base_features + [
            "Up to 50 users",
            "Unlimited projects",
            "Finance module",
            "Custom reports",
            "API access",
            "Dedicated support",
        ]
    elif plan_id == "enterprise":
        return base_features + [
            "Unlimited users",
            "Unlimited projects",
            "Finance module",
            "Custom reports",
            "API access",
            "White labeling",
            "Custom integrations",
            "24/7 support",
            "SLA guarantee",
        ]
    return base_features


@router.get("/subscription")
def get_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current subscription status."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    subscription = db.query(models.Subscription).filter(
        models.Subscription.organisation_id == organisation.id
    ).first()

    if not subscription:
        # Create trial subscription
        trial_end = datetime.utcnow() + timedelta(days=14)
        subscription = models.Subscription(
            organisation_id=organisation.id,
            plan="starter",
            status="trialing",
            max_users=5,
            max_projects=2,
            trial_ends_at=trial_end,
        )
        db.add(subscription)
        db.commit()
        db.refresh(subscription)

    # Count current usage
    user_count = db.query(models.OrgMembership).filter(
        models.OrgMembership.organisation_id == organisation.id,
        models.OrgMembership.is_active == True
    ).count()

    project_count = db.query(models.Project).filter(
        models.Project.organisation_id == organisation.id,
        models.Project.is_active == True
    ).count()

    plan_config = PLANS.get(subscription.plan, PLANS["starter"])

    return {
        "plan": subscription.plan,
        "plan_name": plan_config["name"],
        "status": subscription.status,
        "trial_ends_at": subscription.trial_ends_at.isoformat() if subscription.trial_ends_at else None,
        "current_period_start": subscription.current_period_start.isoformat() if subscription.current_period_start else None,
        "current_period_end": subscription.current_period_end.isoformat() if subscription.current_period_end else None,
        "cancel_at_period_end": subscription.cancel_at_period_end,
        "usage": {
            "users": user_count,
            "max_users": subscription.max_users,
            "projects": project_count,
            "max_projects": subscription.max_projects,
        },
        "features": get_plan_features(subscription.plan),
    }


@router.post("/create-order")
def create_payment_order(
    request: CreateSubscriptionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a Razorpay order for subscription payment."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    if request.plan not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    plan = PLANS[request.plan]
    
    if request.billing_cycle == "yearly":
        amount = plan["price_yearly"]
    else:
        amount = plan["price_monthly"]

    if amount == 0:
        raise HTTPException(status_code=400, detail="Contact sales for Enterprise plan")

    client = get_razorpay_client()
    if not client:
        # Return mock order for development
        return {
            "order_id": f"order_mock_{datetime.utcnow().timestamp()}",
            "amount": amount,
            "currency": "INR",
            "plan": request.plan,
            "billing_cycle": request.billing_cycle,
            "razorpay_key": getattr(settings, 'RAZORPAY_KEY_ID', 'rzp_test_mock'),
            "mock": True,
        }

    try:
        # Create Razorpay order
        order_data = {
            "amount": amount,
            "currency": "INR",
            "receipt": f"sub_{organisation.id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            "notes": {
                "organisation_id": str(organisation.id),
                "plan": request.plan,
                "billing_cycle": request.billing_cycle,
            },
        }
        order = client.order.create(data=order_data)

        return {
            "order_id": order["id"],
            "amount": amount,
            "currency": "INR",
            "plan": request.plan,
            "billing_cycle": request.billing_cycle,
            "razorpay_key": settings.RAZORPAY_KEY_ID,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")


@router.post("/verify-payment")
def verify_payment(
    razorpay_order_id: str = Body(...),
    razorpay_payment_id: str = Body(...),
    razorpay_signature: str = Body(...),
    plan: str = Body(...),
    billing_cycle: str = Body("monthly"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Verify Razorpay payment and activate subscription."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    client = get_razorpay_client()
    
    # For mock payments in development
    if razorpay_order_id.startswith("order_mock_"):
        # Activate subscription directly
        return activate_subscription(db, organisation.id, plan, billing_cycle, razorpay_payment_id, razorpay_order_id)

    if not client:
        raise HTTPException(status_code=500, detail="Payment verification unavailable")

    # Verify signature
    try:
        key_secret = settings.RAZORPAY_KEY_SECRET
        msg = f"{razorpay_order_id}|{razorpay_payment_id}"
        generated_signature = hmac.new(
            key_secret.encode(),
            msg.encode(),
            hashlib.sha256
        ).hexdigest()

        if generated_signature != razorpay_signature:
            raise HTTPException(status_code=400, detail="Invalid payment signature")

        # Verify payment status
        payment = client.payment.fetch(razorpay_payment_id)
        if payment["status"] != "captured":
            raise HTTPException(status_code=400, detail="Payment not captured")

        return activate_subscription(db, organisation.id, plan, billing_cycle, razorpay_payment_id, razorpay_order_id)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment verification failed: {str(e)}")


def activate_subscription(
    db: Session,
    organisation_id: int,
    plan: str,
    billing_cycle: str,
    payment_id: str,
    order_id: str,
) -> dict:
    """Activate subscription after successful payment."""
    plan_config = PLANS.get(plan, PLANS["starter"])
    
    now = datetime.utcnow()
    if billing_cycle == "yearly":
        period_end = now + timedelta(days=365)
        amount = plan_config["price_yearly"] / 100
    else:
        period_end = now + timedelta(days=30)
        amount = plan_config["price_monthly"] / 100

    # Update or create subscription
    subscription = db.query(models.Subscription).filter(
        models.Subscription.organisation_id == organisation_id
    ).first()

    if subscription:
        subscription.plan = plan
        subscription.status = "active"
        subscription.max_users = plan_config["max_users"]
        subscription.max_projects = plan_config["max_projects"]
        subscription.current_period_start = now
        subscription.current_period_end = period_end
        subscription.trial_ends_at = None
        subscription.cancel_at_period_end = False
    else:
        subscription = models.Subscription(
            organisation_id=organisation_id,
            plan=plan,
            status="active",
            max_users=plan_config["max_users"],
            max_projects=plan_config["max_projects"],
            current_period_start=now,
            current_period_end=period_end,
        )
        db.add(subscription)
        db.flush()

    # Record payment
    payment_record = models.PaymentHistory(
        organisation_id=organisation_id,
        subscription_id=subscription.id,
        razorpay_payment_id=payment_id,
        razorpay_order_id=order_id,
        amount=amount,
        currency="INR",
        status="captured",
        plan=plan,
        billing_period_start=now,
        billing_period_end=period_end,
    )
    db.add(payment_record)
    db.commit()

    return {
        "status": "success",
        "plan": plan,
        "valid_until": period_end.isoformat(),
        "message": f"Subscription activated: {plan_config['name']} plan",
    }


@router.post("/cancel")
def cancel_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel subscription at end of current period."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    subscription = db.query(models.Subscription).filter(
        models.Subscription.organisation_id == organisation.id
    ).first()

    if not subscription:
        raise HTTPException(status_code=404, detail="No subscription found")

    if subscription.status == "trialing":
        # Cancel trial immediately
        subscription.status = "canceled"
        subscription.trial_ends_at = datetime.utcnow()
    else:
        # Cancel at end of period
        subscription.cancel_at_period_end = True

    db.commit()

    return {
        "status": "canceled",
        "cancel_at_period_end": subscription.cancel_at_period_end,
        "current_period_end": subscription.current_period_end.isoformat() if subscription.current_period_end else None,
    }


@router.get("/payment-history")
def get_payment_history(
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get payment history for the organisation."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    query = db.query(models.PaymentHistory).filter(
        models.PaymentHistory.organisation_id == organisation.id
    )

    total = query.count()
    payments = query.order_by(models.PaymentHistory.created_at.desc())\
        .offset((page - 1) * per_page).limit(per_page).all()

    data = []
    for p in payments:
        data.append({
            "id": p.id,
            "payment_id": p.razorpay_payment_id,
            "amount": p.amount,
            "currency": p.currency,
            "status": p.status,
            "plan": p.plan,
            "billing_period_start": p.billing_period_start.isoformat() if p.billing_period_start else None,
            "billing_period_end": p.billing_period_end.isoformat() if p.billing_period_end else None,
            "invoice_url": p.invoice_url,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })

    return {
        "data": data,
        "meta": {
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page,
        },
    }


@router.post("/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Razorpay webhooks."""
    webhook_secret = getattr(settings, 'RAZORPAY_WEBHOOK_SECRET', None)
    
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    # Verify webhook signature if secret is configured
    if webhook_secret:
        expected_sig = hmac.new(
            webhook_secret.encode(),
            body,
            hashlib.sha256
        ).hexdigest()
        if expected_sig != signature:
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        payload = json.loads(body)
        event = payload.get("event", "")
        
        if event == "payment.captured":
            # Payment was captured successfully
            payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
            notes = payment_entity.get("notes", {})
            org_id = notes.get("organisation_id")
            plan = notes.get("plan", "starter")
            billing_cycle = notes.get("billing_cycle", "monthly")
            
            if org_id:
                activate_subscription(
                    db,
                    int(org_id),
                    plan,
                    billing_cycle,
                    payment_entity.get("id"),
                    payment_entity.get("order_id"),
                )

        elif event == "subscription.charged":
            # Recurring payment was charged
            subscription_entity = payload.get("payload", {}).get("subscription", {}).get("entity", {})
            razorpay_sub_id = subscription_entity.get("id")
            
            sub = db.query(models.Subscription).filter(
                models.Subscription.razorpay_subscription_id == razorpay_sub_id
            ).first()
            
            if sub:
                sub.status = "active"
                sub.current_period_start = datetime.utcnow()
                sub.current_period_end = datetime.utcnow() + timedelta(days=30)
                db.commit()

        elif event == "subscription.cancelled":
            subscription_entity = payload.get("payload", {}).get("subscription", {}).get("entity", {})
            razorpay_sub_id = subscription_entity.get("id")
            
            sub = db.query(models.Subscription).filter(
                models.Subscription.razorpay_subscription_id == razorpay_sub_id
            ).first()
            
            if sub:
                sub.status = "canceled"
                db.commit()

        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Webhook processing failed: {str(e)}")
