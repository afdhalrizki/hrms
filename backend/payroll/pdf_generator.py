from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from django.utils import formats
from io import BytesIO

class PayslipPDFGenerator:
    def __init__(self, payslip):
        self.payslip = payslip
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

    def _format_currency(self, amount):
        return f"Rp {formats.number_format(amount, force_grouping=True)}"

    def build_header(self):
        from django.db import connection
        self.elements.append(Paragraph("PAYSLIP / SLIP GAJI", self.title_style))
        self.elements.append(Paragraph(f"<b>Company:</b> {connection.tenant.name.title()}", self.styles['Normal']))
        self.elements.append(Spacer(1, 0.2 * inch))

        emp = self.payslip.employee
        header_data = [
            ["Name", f": {emp.fullname}", "Period", f": {self.payslip.period.get_month_display()} {self.payslip.period.year}"],
            ["NIK", f": {emp.nik}", "Payment Date", f": {self.payslip.payment_date or '-'}"],
            ["Department", f": {emp.department.name}", "PTKP Status", f": {emp.ptkp_status}"],
            ["Role", f": {emp.role.name}", "Grade", f": {emp.grade.name}"],
        ]
        
        t = Table(header_data, colWidths=[1*inch, 2.5*inch, 1*inch, 1.5*inch])
        t.setStyle(TableStyle([
            ('FONT', (0,0), (-1,-1), 'Helvetica', 10),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        self.elements.append(t)
        self.elements.append(Spacer(1, 0.4 * inch))

    def build_details(self):
        data = [
            ["Description", "Earnings (Penghasilan)", "Deductions (Potongan)"]
        ]
        
        earnings_total = 0
        deductions_total = 0

        # Base Salary
        data.append(["Basic Salary (Gaji Pokok)", self._format_currency(self.payslip.basic_salary), ""])
        earnings_total += self.payslip.basic_salary

        # Details
        for detail in self.payslip.details.all():
            if not detail.is_deduction:
                data.append([detail.description, self._format_currency(detail.amount), ""])
                earnings_total += detail.amount
            else:
                data.append([detail.description, "", self._format_currency(detail.amount)])
                deductions_total += detail.amount

        # Overtime
        if self.payslip.overtime_pay > 0:
            data.append(["Overtime (Lembur)", self._format_currency(self.payslip.overtime_pay), ""])
            earnings_total += self.payslip.overtime_pay
            
        # Add a blank line before totals
        data.append(["", "", ""])
        
        # Totals
        data.append(["TOTAL", self._format_currency(earnings_total), self._format_currency(deductions_total)])
        
        t = Table(data, colWidths=[3*inch, 1.5*inch, 1.5*inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-2), 0.5, colors.lightgrey),
            ('BOX', (0,0), (-1,-1), 1, colors.black),
        ]))
        self.elements.append(t)
        self.elements.append(Spacer(1, 0.3 * inch))

        # Net Pay
        net_pay_data = [[f"NET SALARY / TERIMA BERSIH: {self._format_currency(self.payslip.net_pay)}"]]
        net_t = Table(net_pay_data, colWidths=[6*inch])
        net_t.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONT', (0,0), (-1,-1), 'Helvetica-Bold', 14),
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F3F4F6')),
            ('TOPPADDING', (0,0), (-1,-1), 10),
            ('BOTTOMPADDING', (0,0), (-1,-1), 10),
            ('BOX', (0,0), (-1,-1), 1, colors.black),
        ]))
        self.elements.append(net_t)

    def generate(self):
        self.build_header()
        self.build_details()
        self.doc.build(self.elements)
        pdf = self.buffer.getvalue()
        self.buffer.close()
        return pdf
