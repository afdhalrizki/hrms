import os
import PyPDF2

# Get the directory where the script is located
current_dir = os.path.dirname(os.path.abspath(__file__))

print(f"Scanning for PDF files in: {current_dir}")

for f in os.listdir(current_dir):
    if f.endswith('.pdf'):
        print(f"Extracting {f}...")
        try:
            text = ""
            pdf_path = os.path.join(current_dir, f)
            with open(pdf_path, 'rb') as pdf_file:
                reader = PyPDF2.PdfReader(pdf_file)
                for page in reader.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"
            
            # Save as .txt in the same directory
            out_path = os.path.join(current_dir, f.replace('.pdf', '.txt'))
            with open(out_path, 'w', encoding='utf-8') as out_file:
                out_file.write(text)
            print(f"Successfully extracted {f} to {out_path}")
        except Exception as e:
            print(f"Failed to extract {f}: {e}")

print("Extraction process complete.")
