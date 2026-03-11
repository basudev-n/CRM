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
    """Generate quotation PDF with improved visual layout and hierarchy."""
    if not REPORTLAB_AVAILABLE:
        raise ImportError("reportlab is required for PDF generation")

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=0.45 * inch,
        bottomMargin=0.45 * inch,
        leftMargin=0.5 * inch,
        rightMargin=0.5 * inch,
    )

    styles = getSampleStyleSheet()
    elements = []

    def fmt_currency(value: Optional[float]) -> str:
        return f"Rs. {float(value or 0):,.2f}"

    def fmt_date(value: Optional[str]) -> str:
        if not value:
            return "N/A"
        try:
            return datetime.fromisoformat(str(value).replace("Z", "+00:00")).strftime("%d %b %Y")
        except Exception:
            return str(value)

    title_style = ParagraphStyle(
        "QuoteTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=24,
        textColor=colors.HexColor("#111827"),
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "QuoteSubTitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        textColor=colors.HexColor("#6B7280"),
    )
    block_heading_style = ParagraphStyle(
        "BlockHeading",
        parent=styles["Heading4"],
        fontName="Helvetica-Bold",
        fontSize=10,
        textColor=colors.HexColor("#111827"),
        spaceAfter=6,
    )
    small_style = ParagraphStyle(
        "SmallText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#374151"),
    )

    palette = {
        "accent": colors.HexColor("#0A5EFF"),
        "ink": colors.HexColor("#111827"),
        "muted": colors.HexColor("#6B7280"),
        "divider": colors.HexColor("#E5E7EB"),
    }

    if organisation.get("logo"):
        try:
            logo = Image(organisation["logo"], width=1.4 * inch, height=0.6 * inch)
        except Exception:
            logo = None
    else:
        logo = None

    company_text_parts = [f"<b>{organisation.get('name', 'Company Name')}</b>"]
    if organisation.get("address"):
        company_text_parts.append(organisation.get("address"))
    if organisation.get("gstin"):
        company_text_parts.append(f"GSTIN: {organisation.get('gstin')}")
    if organisation.get("pan"):
        company_text_parts.append(f"PAN: {organisation.get('pan')}")

    company_paragraph = Paragraph("<br/>".join(company_text_parts), ParagraphStyle("CompanyInfo", parent=styles["Normal"], fontSize=10, leading=14))

    meta_table = Table([
        [Paragraph(f"Quotation #: {quotation_data.get('quotation_number', '')}", ParagraphStyle("HeaderLabel", parent=styles["Heading3"], fontSize=12))],
        [Paragraph(f"Date: {fmt_date(quotation_data.get('created_at'))}", styles["Normal"])],
        [Paragraph(f"Valid until: {fmt_date(quotation_data.get('valid_until'))}", styles["Normal"])],
    ], colWidths=[2.4 * inch])

    header_data = [
        [logo or Spacer(1, 0.2 * inch), company_paragraph, meta_table]
    ]
    header_style = TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, 0), 1, palette["divider"]),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ])
    header_table = Table(header_data, colWidths=[1.6 * inch, 3.0 * inch, 2.2 * inch])
    header_table.setStyle(header_style)
    elements.append(header_table)
    elements.append(Spacer(1, 12))

    customer_block = Table(
        [[
            Paragraph("<b>Bill To</b>", styles["Heading4"]),
            Paragraph(f"{quotation_data.get('customer_name', '—')}\n{quotation_data.get('customer_address', '')}", small_style),
            Paragraph(f"Email: {quotation_data.get('customer_email', '-')}", small_style),
            Paragraph(f"Phone: {quotation_data.get('customer_phone', '-')}", small_style),
        ]]
    )
    customer_block.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F3F6FF")),
        ("BOX", (0, 0), (-1, -1), 1, palette["divider"]),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(customer_block)
    elements.append(Spacer(1, 12))

    items = []
    if quotation_data.get("base_price"):
        items.append({
            "desc": "Base Price",
            "qty": "1",
            "rate": quotation_data.get("base_price"),
            "amount": quotation_data.get("base_price"),
        })
    for extra, label in [
        ("floor_premium", "Floor Premium"),
        ("plc", "PLC"),
        ("parking", "Parking"),
        ("club_membership", "Club Membership"),
        ("other_charges", "Other Charges"),
    ]:
        if quotation_data.get(extra):
            items.append({
                "desc": label,
                "qty": "1",
                "rate": quotation_data.get(extra),
                "amount": quotation_data.get(extra),
            })

    if not items:
        items.append({
            "desc": f"Unit {quotation_data.get('unit_number', '')} ({quotation_data.get('unit_type', '')})",
            "qty": "1",
            "rate": quotation_data.get("total", 0),
            "amount": quotation_data.get("total", 0),
        })

    header_paragraph = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        textColor=colors.white,
    )
    table_data = [
        [
            Paragraph("Description", header_paragraph),
            Paragraph("Qty", header_paragraph),
            Paragraph("Rate (INR)", header_paragraph),
            Paragraph("Amount (INR)", header_paragraph),
        ]
    ]
    for row in items:
        table_data.append([
            Paragraph(row["desc"], styles["Normal"]),
            Paragraph(row["qty"], styles["Normal"]),
            Paragraph(fmt_currency(row["rate"]), styles["Normal"]),
            Paragraph(fmt_currency(row["amount"]), styles["Normal"]),
        ])
    def append_summary(label: str, value: float):
        table_data.append([
            Paragraph("", styles["Normal"]),
            Paragraph("", styles["Normal"]),
            Paragraph(label, styles["Normal"]),
            Paragraph(fmt_currency(value), styles["Normal"]),
        ])
    append_summary("GST", quotation_data.get("gst_amount", 0))
    if quotation_data.get("stamp_duty"):
        append_summary("Stamp Duty", quotation_data.get("stamp_duty"))
    if quotation_data.get("registration"):
        append_summary("Registration", quotation_data.get("registration"))
    table_data.append([
        Paragraph("", styles["Normal"]),
        Paragraph("", styles["Normal"]),
        Paragraph("<b>Total</b>", ParagraphStyle("TotalLabel", parent=styles["Normal"], fontName="Helvetica-Bold")),
        Paragraph(f"<b>{fmt_currency(quotation_data.get('total'))}</b>", ParagraphStyle("TotalValue", parent=styles["Normal"], fontName="Helvetica-Bold")),
    ])

    prod_table = Table(table_data, colWidths=[3.2 * inch, 0.8 * inch, 1.5 * inch, 1.5 * inch], repeatRows=1)
    prod_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), palette["accent"]),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.5, palette["divider"]),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("ALIGN", (2, -1), (3, -1), "RIGHT"),
    ]))
    elements.append(prod_table)
    elements.append(Spacer(1, 16))

    if quotation_data.get("terms_conditions"):
        elements.append(Paragraph("<b>Terms & Conditions</b>", block_heading_style))
        elements.append(Paragraph(str(quotation_data["terms_conditions"]), small_style))
        elements.append(Spacer(1, 8))

    if quotation_data.get("notes"):
        elements.append(Paragraph("<b>Notes</b>", block_heading_style))
        elements.append(Paragraph(str(quotation_data["notes"]), small_style))
        elements.append(Spacer(1, 8))

    footer = Table(
        [[
            Paragraph("Prepared by the sales team", ParagraphStyle("FooterL", parent=styles["Normal"], fontSize=8, textColor=colors.HexColor("#6B7280"))),
            Paragraph(f"Generated on: {datetime.now().strftime('%d %b %Y, %H:%M')}", ParagraphStyle("FooterR", parent=styles["Normal"], fontSize=8, textColor=colors.HexColor("#6B7280"), alignment=2)),
        ]],
        colWidths=[4.2 * inch, 2.2 * inch],
        style=TableStyle([
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]),
    )
    elements.append(footer)

    doc.build(elements)
    return buffer.getvalue()
