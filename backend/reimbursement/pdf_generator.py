from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from io import BytesIO
from django.utils import formats

class ReimbursementPDFGenerator:
    def __init__(self, reimbursement):
        self.reimbursement = reimbursement
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
            alignment=1
        )

    def _format_currency(self, amount):
        return f"Rp {formats.number_format(amount, force_grouping=True)}"

    def build_content(self):
        from django.db import connection
        self.elements.append(Paragraph("REIMBURSEMENT VOUCHER", self.title_style))
        self.elements.append(Paragraph(f"<b>Company:</b> {connection.tenant.name.title()}", self.styles['Normal']))
        self.elements.append(Spacer(1, 0.2 * inch))

        emp = self.reimbursement.employee
        dept_name = emp.department.name if emp.department else "-"
        data = [
            ["Voucher No", f": REIMB-{self.reimbursement.id:06d}", "Date", f": {self.reimbursement.date}"],
            ["Employee Name", f": {emp.fullname}", "NIK", f": {emp.nik}"],
            ["Department", f": {dept_name}", "Status", f": {self.reimbursement.get_status_display()}"],
            ["Category", f": {self.reimbursement.category.name}", "", ""],
        ]
        
        t = Table(data, colWidths=[1.2*inch, 2.3*inch, 1*inch, 1.5*inch])
        t.setStyle(TableStyle([('FONT', (0,0), (-1,-1), 'Helvetica', 10)]))
        self.elements.append(t)
        self.elements.append(Spacer(1, 0.4 * inch))

        details = [
            ["Description", "Amount"],
            [self.reimbursement.description or "No description", self._format_currency(self.reimbursement.amount)],
            ["", ""],
            ["<b>TOTAL CLAIMED</b>", f"<b>{self._format_currency(self.reimbursement.amount)}</b>"],
            ["<b>TOTAL APPROVED</b>", f"<b>{self._format_currency(self.reimbursement.approved_amount or 0)}</b>"],
        ]
        
        dt = Table(details, colWidths=[4.5*inch, 1.5*inch])
        dt.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('GRID', (0,0), (-1, 1), 0.5, colors.grey),
            ('BOX', (0,0), (-1,-1), 1, colors.black),
            ('FONTNAME', (0, 3), (-1, -1), 'Helvetica-Bold'),
        ]))
        self.elements.append(dt)
        self.elements.append(Spacer(1, 0.5 * inch))

        # Signatures
        sig_data = [
            ["Requested by,", "", "Approved by,"],
            ["", "", ""],
            ["", "", ""],
            [f"({emp.fullname})", "", "(Finance / Manager)"],
        ]
        st = Table(sig_data, colWidths=[2.5*inch, 1*inch, 2.5*inch])
        st.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONT', (0,0), (-1,-1), 'Helvetica', 10),
        ]))
        self.elements.append(st)

    def generate(self):
        self.build_content()
        self.doc.build(self.elements)
        pdf = self.buffer.getvalue()
        self.buffer.close()
        return pdf
