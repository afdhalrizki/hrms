from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from io import BytesIO
from datetime import datetime

class AttendancePDFGenerator:
    def __init__(self, tenant_name):
        self.tenant_name = tenant_name
        self.buffer = BytesIO()
        self.styles = getSampleStyleSheet()
        self.title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            spaceAfter=14,
            alignment=1
        )

    def generate_individual_report(self, employee, month, year, attendance_records):
        doc = SimpleDocTemplate(
            self.buffer,
            pagesize=A4,
            rightMargin=inch,
            leftMargin=inch,
            topMargin=inch,
            bottomMargin=inch
        )
        elements = []
        
        elements.append(Paragraph(f"ATTENDANCE REPORT - {datetime(int(year), int(month), 1).strftime('%B %Y')}", self.title_style))
        elements.append(Paragraph(f"<b>Company:</b> {self.tenant_name.title()}", self.styles['Normal']))
        elements.append(Spacer(1, 0.2 * inch))

        dept_name = employee.department.name if employee.department else "-"
        role_name = employee.role.name if employee.role else "-"
        
        info_data = [
            ["Employee Name", f": {employee.fullname}", "NIK", f": {employee.nik}"],
            ["Department", f": {dept_name}", "Position", f": {role_name}"],
        ]
        it = Table(info_data, colWidths=[1.2*inch, 2.3*inch, 0.8*inch, 2.2*inch])
        it.setStyle(TableStyle([('FONT', (0,0), (-1,-1), 'Helvetica', 10)]))
        elements.append(it)
        elements.append(Spacer(1, 0.3 * inch))

        data = [["Date", "Clock In", "Clock Out", "Status"]]
        for rec in attendance_records:
            data.append([
                rec.date.strftime('%Y-%m-%d'),
                rec.check_in.strftime('%H:%M:%S') if rec.check_in else "-",
                rec.check_out.strftime('%H:%M:%S') if rec.check_out else "-",
                rec.get_status_display()
            ])

        t = Table(data, colWidths=[1.5*inch, 1.5*inch, 1.5*inch, 1.5*inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3B82F6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
        ]))
        elements.append(t)
        
        doc.build(elements)
        pdf = self.buffer.getvalue()
        self.buffer.close()
        return pdf

    def generate_summary_report(self, month, year, stats):
        doc = SimpleDocTemplate(
            self.buffer,
            pagesize=A4,
            rightMargin=0.5*inch,
            leftMargin=0.5*inch,
            topMargin=inch,
            bottomMargin=inch
        )
        elements = []
        
        elements.append(Paragraph(f"COMPANY ATTENDANCE SUMMARY - {datetime(int(year), int(month), 1).strftime('%B %Y')}", self.title_style))
        elements.append(Paragraph(f"<b>Company:</b> {self.tenant_name.title()}", self.styles['Normal']))
        elements.append(Spacer(1, 0.3 * inch))

        data = [["Employee Name", "NIK", "Present", "Late", "Off-site", "Absent", "Rate (%)"]]
        for s in stats:
            total_work_days = s['total_present'] + s['total_late'] + s['total_offsite'] + s['total_absent']
            rate = (s['total_present'] + s['total_late'] + s['total_offsite']) / total_work_days * 100 if total_work_days > 0 else 0
            
            data.append([
                s['employee__fullname'],
                s['employee__nik'],
                s['total_present'],
                s['total_late'],
                s['total_offsite'],
                s['total_absent'],
                f"{rate:.1f}%"
            ])

        t = Table(data, colWidths=[2.2*inch, 1.2*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.9*inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('FONTSIZE', (0,0), (-1,-1), 9),
        ]))
        elements.append(t)
        
        doc.build(elements)
        pdf = self.buffer.getvalue()
        self.buffer.close()
        return pdf
