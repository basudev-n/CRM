# PDF Generation utilities
# Uses reportlab for PDF generation with organisation branding

from io import BytesIO
from datetime import datetime
from typing import Optional

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


def generate_invoice_pdf(
    invoice_data: dict,
    organisation: dict,
    booking: dict,
    payments: list
) -> bytes:
    """Generate invoice PDF with organisation branding."""
    if not REPORTLAB_AVAILABLE:
        raise ImportError("reportlab is required for PDF generation")

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)

    styles = getSampleStyleSheet()
    elements = []

    # Company Header
    if organisation.get("logo"):
        try:
            logo = Image(organisation["logo"], width=1.5*inch, height=0.75*inch)
            elements.append(logo)
        except:
            pass

    # Company Name
    company_style = ParagraphStyle(
        "CompanyName",
        parent=styles["Heading1"],
        fontSize=18,
        spaceAfter=10,
    )
    elements.append(Paragraph(organisation.get("name", "Company Name"), company_style))

    # Company Address
    if organisation.get("address"):
        elements.append(Paragraph(organisation.get("address"), styles["Normal"]))
    if organisation.get("gstin"):
        elements.append(Paragraph(f"GSTIN: {organisation.get('gstin')}", styles["Normal"]))
    if organisation.get("pan"):
        elements.append(Paragraph(f"PAN: {organisation.get('pan')}", styles["Normal"]))

    elements.append(Spacer(1, 20))

    # Invoice Title
    elements.append(Paragraph("INVOICE", styles["Heading2"]))
    elements.append(Spacer(1, 10))

    # Invoice Details Table
    invoice_info = [
        ["Invoice Number:", invoice_data.get("invoice_number", "")],
        ["Invoice Date:", invoice_data.get("invoice_date", "")],
        ["Due Date:", invoice_data.get("due_date", "N/A")],
        ["Customer Name:", booking.get("customer_name", "")],
    ]

    info_table = Table(invoice_info, colWidths=[2*inch, 3*inch])
    info_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))

    # Unit Details
    elements.append(Paragraph("Property Details", styles["Heading3"]))
    unit_info = [
        ["Project:", booking.get("project_name", "")],
        ["Unit Number:", booking.get("unit_number", "N/A")],
        ["Unit Type:", booking.get("unit_type", "")],
        ["Area (sq ft):", str(booking.get("area_sqft", "N/A"))],
    ]
    unit_table = Table(unit_info, colWidths=[2*inch, 3*inch])
    unit_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(unit_table)
    elements.append(Spacer(1, 20))

    # Amount Table
    amount_data = [
        ["Description", "Amount (INR)"],
        ["Total Amount", f"₹{invoice_data.get('total_amount', 0):,.2f}"],
        ["Paid Amount", f"₹{invoice_data.get('paid_amount', 0):,.2f}"],
        ["Balance Amount", f"₹{invoice_data.get('balance_amount', 0):,.2f}"],
    ]
    amount_table = Table(amount_data, colWidths=[4*inch, 2*inch])
    amount_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 1, colors.black),
        ("BACKGROUND", (0, -1), (-1, -1), colors.lightgrey),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
    ]))
    elements.append(amount_table)
    elements.append(Spacer(1, 30))

    # Payment History
    if payments:
        elements.append(Paragraph("Payment History", styles["Heading3"]))
        payment_data = [["Date", "Amount", "Method", "Reference"]]
        for payment in payments:
            payment_data.append([
                payment.get("payment_date", ""),
                f"₹{payment.get('amount', 0):,.2f}",
                payment.get("payment_method", "").upper(),
                payment.get("reference_number", "N/A"),
            ])
        payment_table = Table(payment_data, colWidths=[1.5*inch, 1.5*inch, 1*inch, 2*inch])
        payment_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(payment_table)

    # Notes
    if invoice_data.get("notes"):
        elements.append(Spacer(1, 20))
        elements.append(Paragraph("Notes:", styles["Heading4"]))
        elements.append(Paragraph(invoice_data["notes"], styles["Normal"]))

    # Footer
    elements.append(Spacer(1, 30))
    elements.append(Paragraph("Thank you for your business!", styles["Normal"]))
    elements.append(Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles["Normal"]))

    doc.build(elements)
    return buffer.getvalue()


def generate_quotation_pdf(
    quotation_data: dict,
    organisation: dict
) -> bytes:
    """Generate quotation PDF with organisation branding."""
    if not REPORTLAB_AVAILABLE:
        raise ImportError("reportlab is required for PDF generation")

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)

    styles = getSampleStyleSheet()
    elements = []

    # Company Header
    if organisation.get("logo"):
        try:
            logo = Image(organisation["logo"], width=1.5*inch, height=0.75*inch)
            elements.append(logo)
        except:
            pass

    company_style = ParagraphStyle(
        "CompanyName",
        parent=styles["Heading1"],
        fontSize=18,
        spaceAfter=10,
    )
    elements.append(Paragraph(organisation.get("name", "Company Name"), company_style))

    if organisation.get("address"):
        elements.append(Paragraph(organisation.get("address"), styles["Normal"]))

    elements.append(Spacer(1, 20))
    elements.append(Paragraph("QUOTATION", styles["Heading2"]))
    elements.append(Spacer(1, 10))

    # Quotation Details
    quote_info = [
        ["Quotation Number:", quotation_data.get("quotation_number", "")],
        ["Date:", quotation_data.get("created_at", "")],
        ["Valid Until:", quotation_data.get("valid_until", "N/A")],
        ["Customer:", quotation_data.get("customer_name", "")],
    ]

    info_table = Table(quote_info, colWidths=[2*inch, 3*inch])
    info_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))

    # Pricing Breakdown
    elements.append(Paragraph("Price Details", styles["Heading3"]))
    pricing_data = [
        ["Description", "Amount (INR)"],
        ["Base Price", f"₹{quotation_data.get('base_price', 0):,.2f}"],
    ]
    if quotation_data.get("floor_premium"):
        pricing_data.append(["Floor Premium", f"₹{quotation_data['floor_premium']:,.2f}"])
    if quotation_data.get("plc"):
        pricing_data.append(["PLC", f"₹{quotation_data['plc']:,.2f}"])
    if quotation_data.get("parking"):
        pricing_data.append(["Parking", f"₹{quotation_data['parking']:,.2f}"])
    if quotation_data.get("club_membership"):
        pricing_data.append(["Club Membership", f"₹{quotation_data['club_membership']:,.2f}"])
    pricing_data.append(["GST", f"₹{quotation_data.get('gst_amount', 0):,.2f}"])
    if quotation_data.get("stamp_duty"):
        pricing_data.append(["Stamp Duty", f"₹{quotation_data['stamp_duty']:,.2f}"])
    if quotation_data.get("registration"):
        pricing_data.append(["Registration", f"₹{quotation_data['registration']:,.2f}"])
    pricing_data.append(["TOTAL", f"₹{quotation_data.get('total', 0):,.2f}"])

    pricing_table = Table(pricing_data, colWidths=[4*inch, 2*inch])
    pricing_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("BACKGROUND", (0, -1), (-1, -1), colors.lightgrey),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
    ]))
    elements.append(pricing_table)

    # Terms
    if quotation_data.get("terms_conditions"):
        elements.append(Spacer(1, 20))
        elements.append(Paragraph("Terms & Conditions", styles["Heading4"]))
        elements.append(Paragraph(quotation_data["terms_conditions"], styles["Normal"]))

    doc.build(elements)
    return buffer.getvalue()
