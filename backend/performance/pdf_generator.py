from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from io import BytesIO

class AppraisalPDFGenerator:
    def __init__(self, appraisal):
        self.appraisal = appraisal
        self.buffer = BytesIO()
        self.doc = SimpleDocTemplate(
            self.buffer,
            pagesize=A4,
            rightMargin=inch,
            leftMargin=inch,
            topMargin=inch,
            bottomMargin=inch
        )
        self.styles = getSampleStyleSheet()
        self.elements = []
        
        self.title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            spaceAfter=14,
            alignment=1 # Center
        )
        self.section_style = ParagraphStyle(
            'SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceBefore=12,
            spaceAfter=6,
            color=colors.HexColor('#2563EB')
        )

    def build_header(self):
        from django.db import connection
        self.elements.append(Paragraph("PERFORMANCE APPRAISAL REPORT", self.title_style))
        self.elements.append(Paragraph(f"<b>Company:</b> {connection.tenant.name.title()}", self.styles['Normal']))
        self.elements.append(Spacer(1, 0.2 * inch))

        emp = self.appraisal.employee
        dept_name = emp.department.name if emp.department else "-"
        role_name = emp.role.name if emp.role else "-"
        
        header_data = [
            ["Employee Name", f": {emp.fullname}", "Period", f": {self.appraisal.period_name}"],
            ["NIK", f": {emp.nik}", "Start Date", f": {self.appraisal.start_date}"],
            ["Department", f": {dept_name}", "End Date", f": {self.appraisal.end_date}"],
            ["Position", f": {role_name}", "Status", f": {self.appraisal.get_status_display()}"],
        ]
        
        t = Table(header_data, colWidths=[1.2*inch, 2.3*inch, 1*inch, 1.5*inch])
        t.setStyle(TableStyle([
            ('FONT', (0,0), (-1,-1), 'Helvetica', 10),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        self.elements.append(t)
        self.elements.append(Spacer(1, 0.2 * inch))

    def build_kpis(self):
        from .models import KPITarget
        self.elements.append(Paragraph("KPI Performance", self.section_style))
        
        # Fetch KPI targets for this employee during the appraisal period
        # Note: Ideally linked directly to appraisal, but here we'll fetch based on date overlap
        targets = KPITarget.objects.filter(
            employee=self.appraisal.employee,
            period__gte=self.appraisal.start_date,
            period__lte=self.appraisal.end_date
        )
        
        if not targets.exists():
            self.elements.append(Paragraph("No KPI targets found for this period.", self.styles['Italic']))
            return

        data = [["KPI Name", "Target", "Actual", "Achievement (%)"]]
        for t in targets:
            achievement = 0
            if t.target_value > 0:
                achievement = (t.actual_value / t.target_value) * 100
            
            data.append([
                t.kpi.name,
                f"{t.target_value:g}",
                f"{t.actual_value:g}",
                f"{achievement:.1f}%"
            ])
            
        table = Table(data, colWidths=[2.5*inch, 1.2*inch, 1.2*inch, 1.3*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F3F4F6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 6),
        ]))
        self.elements.append(table)
        self.elements.append(Spacer(1, 0.2 * inch))

    def build_reviews(self):
        self.elements.append(Paragraph("Reviewer Comments & Ratings", self.section_style))
        
        reviews = self.appraisal.reviews.all()
        if not reviews.exists():
            self.elements.append(Paragraph("No reviews submitted yet.", self.styles['Italic']))
            return

        for review in reviews:
            self.elements.append(Paragraph(f"<b>{review.get_reviewer_type_display()}</b> by {review.reviewer.fullname}", self.styles['Normal']))
            
            # Comments
            self.elements.append(Paragraph("Comments:", self.styles['Normal']))
            self.elements.append(Paragraph(review.comments or "No comments provided.", self.styles['Normal']))
            
            # Ratings Table
            if review.ratings:
                rating_data = [["Criteria", "Rating"]]
                for criteria, score in review.ratings.items():
                    rating_data.append([criteria.replace('_', ' ').title(), str(score)])
                
                rt = Table(rating_data, colWidths=[4*inch, 1.5*inch])
                rt.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E5E7EB')),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
                    ('ALIGN', (1, 0), (1, -1), 'CENTER'),
                ]))
                self.elements.append(rt)
            
            self.elements.append(Spacer(1, 0.2 * inch))

    def generate(self):
        self.build_header()
        self.build_kpis()
        self.build_reviews()
        self.doc.build(self.elements)
        pdf = self.buffer.getvalue()
        self.buffer.close()
        return pdf
