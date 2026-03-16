import os
import PyPDF2

pdf_dir = r"d:\hr\hrms\reference"
for f in os.listdir(pdf_dir):
    if f.endswith('.pdf'):
        print(f"Extracting {f}")
        try:
            text = ""
            with open(os.path.join(pdf_dir, f), 'rb') as pdf_file:
                reader = PyPDF2.PdfReader(pdf_file)
                for page in reader.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"
            
            out_path = os.path.join(pdf_dir, f.replace('.pdf', '.txt'))
            with open(out_path, 'w', encoding='utf-8') as out_file:
                out_file.write(text)
            print(f"Successfully extracted {f} to {out_path}")
        except Exception as e:
            print(f"Failed to extract {f}: {e}")
print("Done")
