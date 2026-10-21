import io
from typing import Any, Dict
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

class PDFExporter:
    @staticmethod
    def generate_pdf(trip: Dict[str, Any], itinerary: Dict[str, Any]) -> io.BytesIO:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40
        )

        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "TripTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#1A365D"),
            spaceAfter=6
        )

        subtitle_style = ParagraphStyle(
            "TripSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=11,
            leading=15,
            textColor=colors.HexColor("#4A5568"),
            spaceAfter=12
        )

        section_heading = ParagraphStyle(
            "SectionHeading",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#2B6CB0"),
            spaceBefore=14,
            spaceAfter=6
        )

        day_heading = ParagraphStyle(
            "DayHeading",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#2C7A7B"),
            spaceBefore=10,
            spaceAfter=4
        )

        activity_title = ParagraphStyle(
            "ActTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=13,
            textColor=colors.HexColor("#2D3748")
        )

        body_style = ParagraphStyle(
            "Body",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#4A5568")
        )

        tag_style = ParagraphStyle(
            "Tag",
            parent=styles["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#718096")
        )

        elements = []

        # Header
        elements.append(Paragraph(trip.get("title", "Personalized Travel Itinerary"), title_style))
        dest = trip.get("destination", "Destination")
        s_date = trip.get("start_date", "")
        e_date = trip.get("end_date", "")
        elements.append(Paragraph(f"Destination: <b>{dest}</b> &nbsp;|&nbsp; Dates: <b>{s_date} to {e_date}</b>", subtitle_style))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#CBD5E0"), spaceAfter=10))

        # Overview Box
        budget = trip.get("budget_amount", "Flexible")
        currency = trip.get("currency", "USD")
        travelers = trip.get("traveler_count", 1)
        vibe = trip.get("travel_preferences", {}).get("travel_vibe", "Standard").capitalize()

        meta_data = [
            [
                Paragraph("<b>Travelers:</b>", body_style), Paragraph(str(travelers), body_style),
                Paragraph("<b>Estimated Budget:</b>", body_style), Paragraph(f"{budget} {currency}", body_style)
            ],
            [
                Paragraph("<b>Travel Vibe:</b>", body_style), Paragraph(vibe, body_style),
                Paragraph("<b>Verification:</b>", body_style), Paragraph("AI Guided (Verify local hours)", tag_style)
            ]
        ]
        meta_table = Table(meta_data, colWidths=[80, 180, 100, 170])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F7FAFC")),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 10))

        # Days and Activities
        days = itinerary.get("days", [])
        for d in days:
            day_num = d.get("day_number", 1)
            date_str = d.get("date", "")
            summary = d.get("summary", "")
            elements.append(Paragraph(f"Day {day_num} &bull; {date_str} &mdash; {summary}", day_heading))

            acts = d.get("activities", [])
            for a in acts:
                time_range = f"{a.get('start_time', '')} - {a.get('end_time', '')}".strip(" -")
                name = a.get("name", "Activity")
                desc = a.get("description", "")
                loc = a.get("location_name", "")
                cost = a.get("estimated_cost", 0.0)
                curr = a.get("currency", "USD")
                cat = a.get("category", "sightseeing").upper()
                verif = a.get("verification_status", "estimated").capitalize()

                cost_str = f"Cost: ~{cost:.2f} {curr}" if cost > 0 else "Free / Included"
                loc_str = f" &bull; Location: {loc}" if loc else ""

                act_p = Paragraph(f"<b>[{time_range}] {name}</b> ({cat})", activity_title)
                desc_p = Paragraph(f"{desc}<br/><font color='#718096'><i>{cost_str}{loc_str} &bull; [{verif}]</i></font>", body_style)

                act_data = [[act_p], [desc_p]]
                act_table = Table(act_data, colWidths=[530])
                act_table.setStyle(TableStyle([
                    ('LEFTPADDING', (0,0), (-1,-1), 10),
                    ('RIGHTPADDING', (0,0), (-1,-1), 6),
                    ('TOPPADDING', (0,0), (-1,-1), 2),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
                    ('LINELEFT', (0,0), (0,-1), 2, colors.HexColor("#319795")),
                ]))
                elements.append(act_table)
                elements.append(Spacer(1, 4))

            elements.append(Spacer(1, 6))

        # Practical Notes
        structured = itinerary.get("structured_itinerary", {})
        tips = structured.get("practical_tips", [])
        if tips:
            elements.append(Paragraph("Practical Travel Tips", section_heading))
            for tip in tips:
                elements.append(Paragraph(f"&bull; {tip}", body_style))
                elements.append(Spacer(1, 2))

        doc.build(elements)
        buffer.seek(0)
        return buffer

pdf_exporter = PDFExporter()
