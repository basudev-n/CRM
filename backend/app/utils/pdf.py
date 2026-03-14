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
    """Generate quotation PDF matching PropFlow's card-based design aesthetic.

    Uses a dark header card, clean pricing breakdown, and modern
    zinc-900 / cream palette mirroring the web UI.
    """
    if not REPORTLAB_AVAILABLE:
        raise ImportError("reportlab is required for PDF generation")

    buffer = BytesIO()
    page_w, page_h = A4
    margin = 0.55 * inch
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=margin,
        bottomMargin=margin,
        leftMargin=margin,
        rightMargin=margin,
    )

    styles = getSampleStyleSheet()
    elements = []

    # ── Colour palette (mirrors platform zinc / cream) ─────────────
    INK = colors.HexColor("#18181B")        # zinc-900
    MUTED = colors.HexColor("#71717A")      # zinc-500
    LIGHT_TEXT = colors.HexColor("#A1A1AA")  # zinc-400
    DIVIDER = colors.HexColor("#E4E4E7")    # zinc-200
    CREAM = colors.HexColor("#F7F5F2")      # cream bg
    WHITE = colors.white
    DARK_BG = colors.HexColor("#18181B")    # dark card bg

    content_w = page_w - 2 * margin

    # ── Helper styles ──────────────────────────────────────────────
    def _style(name, **kw):
        return ParagraphStyle(name, parent=styles["Normal"], **kw)

    s_white_bold = _style("WhB", fontName="Helvetica-Bold", fontSize=11, textColor=WHITE)
    s_white_sm = _style("WhSm", fontName="Helvetica", fontSize=9, textColor=colors.HexColor("#A1A1AA"), leading=13)
    s_white_lg = _style("WhLg", fontName="Helvetica-Bold", fontSize=22, textColor=WHITE, leading=26)
    s_ink_bold = _style("IkB", fontName="Helvetica-Bold", fontSize=10, textColor=INK)
    s_ink_sm = _style("IkSm", fontName="Helvetica", fontSize=9, textColor=INK, leading=13)
    s_muted_sm = _style("MuSm", fontName="Helvetica", fontSize=9, textColor=MUTED, leading=13)
    s_muted_xs = _style("MuXs", fontName="Helvetica", fontSize=7.5, textColor=LIGHT_TEXT, leading=10)
    s_label = _style("Lbl", fontName="Helvetica-Bold", fontSize=7, textColor=LIGHT_TEXT,
                      spaceAfter=2, leading=9)
    s_section = _style("Sec", fontName="Helvetica-Bold", fontSize=8, textColor=LIGHT_TEXT,
                        spaceAfter=6, leading=10)

    def fmt_currency(value) -> str:
        try:
            v = float(value or 0)
            if v >= 10_000_000:
                return f"Rs. {v / 10_000_000:,.2f} Cr"
            if v >= 100_000:
                return f"Rs. {v / 100_000:,.2f} L"
            return f"Rs. {v:,.0f}"
        except Exception:
            return "Rs. 0"

    def fmt_currency_full(value) -> str:
        try:
            return f"Rs. {float(value or 0):,.2f}"
        except Exception:
            return "Rs. 0.00"

    def fmt_date(value) -> str:
        if not value:
            return "N/A"
        try:
            return datetime.fromisoformat(str(value).replace("Z", "+00:00")).strftime("%d %b %Y")
        except Exception:
            return str(value)

    # ================================================================
    # 1) DARK HEADER CARD
    # ================================================================
    org_name = organisation.get("name", "Company")

    header_left_parts = []
    if organisation.get("logo"):
        try:
            logo = Image(organisation["logo"], width=1.2 * inch, height=0.5 * inch)
            header_left_parts.append(logo)
        except Exception:
            pass

    header_left_parts.append(Paragraph(org_name, s_white_bold))
    addr_lines = []
    if organisation.get("address"):
        addr_lines.append(organisation["address"])
    if organisation.get("gstin"):
        addr_lines.append(f"GSTIN: {organisation['gstin']}")
    if organisation.get("pan"):
        addr_lines.append(f"PAN: {organisation['pan']}")
    if addr_lines:
        header_left_parts.append(Paragraph("<br/>".join(addr_lines), s_white_sm))

    header_right_parts = [
        Paragraph("QUOTATION", _style("QTitle", fontName="Helvetica-Bold", fontSize=8,
                                        textColor=colors.HexColor("#A1A1AA"), alignment=2, leading=10)),
        Paragraph(quotation_data.get("quotation_number", ""), _style("QNum", fontName="Helvetica-Bold",
                                                                      fontSize=14, textColor=WHITE, alignment=2, leading=18)),
        Spacer(1, 6),
        Paragraph(f"Date: {fmt_date(quotation_data.get('created_at'))}", _style("QD1", fontName="Helvetica",
                                                                                  fontSize=8, textColor=colors.HexColor("#A1A1AA"), alignment=2)),
        Paragraph(f"Valid until: {fmt_date(quotation_data.get('valid_until'))}", _style("QD2", fontName="Helvetica",
                                                                                         fontSize=8, textColor=colors.HexColor("#A1A1AA"), alignment=2)),
    ]

    left_col = []
    for p in header_left_parts:
        left_col.append([p])
    right_col = []
    for p in header_right_parts:
        right_col.append([p])

    # Pad to same length
    while len(left_col) < len(right_col):
        left_col.append([Spacer(1, 1)])
    while len(right_col) < len(left_col):
        right_col.append([Spacer(1, 1)])

    header_rows = []
    for l_cell, r_cell in zip(left_col, right_col):
        header_rows.append([l_cell[0], r_cell[0]])

    header_table = Table(header_rows, colWidths=[content_w * 0.55, content_w * 0.45])
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), DARK_BG),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 16),
        ("RIGHTPADDING", (0, 0), (-1, -1), 16),
        ("TOPPADDING", (0, 0), (0, 0), 16),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 16),
        ("TOPPADDING", (0, 0), (-1, 0), 16),
        ("ROUNDRECT", (0, 0), (-1, -1), 12, 1, DARK_BG),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 14))

    # ================================================================
    # 2) CUSTOMER & PROJECT — two side-by-side "cards"
    # ================================================================
    half_w = content_w * 0.48

    def _info_card(label: str, lines: list[str]):
        """Build a small vertical info block."""
        parts = [Paragraph(label, s_label)]
        for line in lines:
            parts.append(Paragraph(line, s_ink_sm if lines.index(line) == 0 else s_muted_sm))
        return parts

    customer_lines = [quotation_data.get("customer_name", "—")]
    if quotation_data.get("customer_email"):
        customer_lines.append(quotation_data["customer_email"])
    if quotation_data.get("customer_phone"):
        customer_lines.append(quotation_data["customer_phone"])

    project_lines = [quotation_data.get("project_name", "—")]
    unit_detail = ""
    if quotation_data.get("tower"):
        unit_detail += f"Tower {quotation_data['tower']}"
    if quotation_data.get("unit_number"):
        unit_detail += f" · Unit {quotation_data['unit_number']}" if unit_detail else f"Unit {quotation_data['unit_number']}"
    if unit_detail:
        project_lines.append(unit_detail)
    if quotation_data.get("unit_type"):
        project_lines.append(quotation_data["unit_type"])
    if quotation_data.get("area_sqft"):
        project_lines.append(f"{quotation_data['area_sqft']} sq.ft")

    cust_cell_parts = _info_card("CUSTOMER", customer_lines)
    proj_cell_parts = _info_card("PROJECT", project_lines)

    # Build inner tables for each card cell
    def _card_table(parts):
        return Table([[p] for p in parts], colWidths=[half_w - 24])

    cust_tbl = _card_table(cust_cell_parts)
    proj_tbl = _card_table(proj_cell_parts)

    info_table = Table(
        [[cust_tbl, proj_tbl]],
        colWidths=[half_w, half_w],
        spaceBefore=0,
        spaceAfter=0,
    )
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), CREAM),
        ("BACKGROUND", (1, 0), (1, 0), CREAM),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("ROUNDRECT", (0, 0), (0, 0), 8, 0.5, DIVIDER),
        ("ROUNDRECT", (1, 0), (1, 0), 8, 0.5, DIVIDER),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 14))

    # ================================================================
    # 3) PRICE BREAKDOWN — clean line-item card
    # ================================================================
    elements.append(Paragraph("PRICE BREAKDOWN", s_section))

    pricing_items = []
    if quotation_data.get("base_price"):
        pricing_items.append(("Base Price", quotation_data["base_price"]))
    for key, label in [
        ("floor_premium", "Floor Premium"),
        ("plc", "PLC"),
        ("parking", "Parking"),
        ("club_membership", "Club Membership"),
        ("other_charges", "Other Charges"),
    ]:
        if quotation_data.get(key):
            pricing_items.append((label, quotation_data[key]))

    subtotal = sum(v for _, v in pricing_items)

    price_rows = []
    for label, val in pricing_items:
        price_rows.append([
            Paragraph(label, s_muted_sm),
            Paragraph(fmt_currency_full(val), _style("PrV", fontName="Helvetica", fontSize=9, textColor=INK, alignment=2)),
        ])

    # Subtotal
    price_rows.append([
        Paragraph("Subtotal", s_ink_bold),
        Paragraph(fmt_currency_full(subtotal), _style("SubV", fontName="Helvetica-Bold", fontSize=9, textColor=INK, alignment=2)),
    ])

    # GST
    price_rows.append([
        Paragraph("GST", s_muted_sm),
        Paragraph(fmt_currency_full(quotation_data.get("gst_amount")), _style("G", fontName="Helvetica", fontSize=9, textColor=INK, alignment=2)),
    ])

    if quotation_data.get("stamp_duty"):
        price_rows.append([
            Paragraph("Stamp Duty", s_muted_sm),
            Paragraph(fmt_currency_full(quotation_data["stamp_duty"]), _style("SD", fontName="Helvetica", fontSize=9, textColor=INK, alignment=2)),
        ])
    if quotation_data.get("registration"):
        price_rows.append([
            Paragraph("Registration", s_muted_sm),
            Paragraph(fmt_currency_full(quotation_data["registration"]), _style("Rg", fontName="Helvetica", fontSize=9, textColor=INK, alignment=2)),
        ])

    # Total row
    total_label_style = _style("TL", fontName="Helvetica-Bold", fontSize=11, textColor=INK)
    total_val_style = _style("TV", fontName="Helvetica-Bold", fontSize=11, textColor=INK, alignment=2)
    price_rows.append([
        Paragraph("Total", total_label_style),
        Paragraph(fmt_currency_full(quotation_data.get("total")), total_val_style),
    ])

    price_table = Table(price_rows, colWidths=[content_w * 0.6, content_w * 0.4])

    # Find indices for styling
    subtotal_idx = len(pricing_items)  # row after line items
    total_idx = len(price_rows) - 1

    base_style = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        # Light divider below each row
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, DIVIDER),
        # Thicker line above subtotal
        ("LINEABOVE", (0, subtotal_idx), (-1, subtotal_idx), 1, DIVIDER),
        # Dark total row
        ("BACKGROUND", (0, total_idx), (-1, total_idx), DARK_BG),
        ("TEXTCOLOR", (0, total_idx), (-1, total_idx), WHITE),
        ("TOPPADDING", (0, total_idx), (-1, total_idx), 10),
        ("BOTTOMPADDING", (0, total_idx), (-1, total_idx), 10),
        # Outer border
        ("BOX", (0, 0), (-1, -1), 0.5, DIVIDER),
        ("ROUNDRECT", (0, 0), (-1, -1), 8, 0.5, DIVIDER),
    ]

    price_table.setStyle(TableStyle(base_style))
    elements.append(price_table)
    elements.append(Spacer(1, 14))

    # ================================================================
    # 4) TERMS & NOTES — cream card
    # ================================================================
    has_terms = quotation_data.get("terms_conditions")
    has_notes = quotation_data.get("notes")

    if has_terms or has_notes:
        tn_rows = []
        if has_terms:
            tn_rows.append([
                Paragraph("TERMS & CONDITIONS", s_label),
            ])
            tn_rows.append([
                Paragraph(str(quotation_data["terms_conditions"]), s_muted_sm),
            ])
        if has_notes:
            if has_terms:
                tn_rows.append([Spacer(1, 6)])
            tn_rows.append([
                Paragraph("NOTES", s_label),
            ])
            tn_rows.append([
                Paragraph(str(quotation_data["notes"]), s_muted_sm),
            ])

        tn_table = Table(tn_rows, colWidths=[content_w - 24])
        tn_table_outer = Table([[tn_table]], colWidths=[content_w])
        tn_table_outer.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), CREAM),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("BOX", (0, 0), (-1, -1), 0.5, DIVIDER),
            ("ROUNDRECT", (0, 0), (-1, -1), 8, 0.5, DIVIDER),
        ]))
        elements.append(tn_table_outer)
        elements.append(Spacer(1, 14))

    # ================================================================
    # 5) FOOTER
    # ================================================================
    footer_left = Paragraph(
        f"Generated by PropFlow · {org_name}",
        _style("FL", fontName="Helvetica", fontSize=7, textColor=LIGHT_TEXT),
    )
    footer_right = Paragraph(
        f"{datetime.now().strftime('%d %b %Y, %H:%M')}",
        _style("FR", fontName="Helvetica", fontSize=7, textColor=LIGHT_TEXT, alignment=2),
    )
    footer = Table(
        [[footer_left, footer_right]],
        colWidths=[content_w * 0.6, content_w * 0.4],
    )
    footer.setStyle(TableStyle([
        ("LINEABOVE", (0, 0), (-1, 0), 0.5, DIVIDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    elements.append(footer)

    doc.build(elements)
    return buffer.getvalue()
