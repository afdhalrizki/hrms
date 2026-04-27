from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from io import BytesIO

class AppraisalDOCXGenerator:
    def __init__(self, appraisal):
        self.appraisal = appraisal

    def generate(self):
        document = Document()
        
        # Header
        header = document.add_heading('PERFORMANCE APPRAISAL REPORT', 0)
        header.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        # Employee Info
        table = document.add_table(rows=0, cols=2)
        def add_row(label, value):
            row = table.add_row().cells
            row[0].text = label
            row[1].text = str(value)
            row[0].paragraphs[0].runs[0].bold = True

        add_row('Employee Name:', self.appraisal.employee.fullname)
        add_row('Department:', self.appraisal.employee.department.name if self.appraisal.employee.department else '-')
        add_row('Period:', self.appraisal.period)
        add_row('Status:', self.appraisal.status)
        add_row('Final Score:', f"{self.appraisal.final_score or 0:.2f} / 5.0")
        
        document.add_paragraph()
        
        # KPI Results
        document.add_heading('KPI ATTAINMENT', level=1)
        kpi_table = document.add_table(rows=1, cols=3)
        kpi_table.style = 'Table Grid'
        hdr = kpi_table.rows[0].cells
        hdr[0].text = 'KPI Name'
        hdr[1].text = 'Target'
        hdr[2].text = 'Actual'
        
        # Note: In a real app, we'd loop through related KPI results
        # For this mock, we'll just add a summary or placeholders if not available
        
        document.add_paragraph()
        
        # Manager Comments
        document.add_heading('MANAGER FEEDBACK', level=1)
        # Find manager review
        manager_review = self.appraisal.reviews.filter(review_type='MANAGER').first()
        if manager_review:
            document.add_paragraph(manager_review.comments or "No comments provided.")
        else:
            document.add_paragraph("Manager review pending.")
            
        document.add_paragraph()
        
        # Signatures
        document.add_paragraph('__________________________')
        document.add_paragraph('Employee Signature')
        
        document.add_paragraph()
        document.add_paragraph('__________________________')
        document.add_paragraph('Manager Signature')
        
        f = BytesIO()
        document.save(f)
        return f.getvalue()
