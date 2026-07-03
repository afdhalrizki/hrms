import collections
import collections.abc
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def create_presentation():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    
    # Define Colors
    bg_color = RGBColor(10, 25, 47)        # Dark Slate Navy
    accent_color = RGBColor(100, 255, 218)  # Teal
    white_color = RGBColor(255, 255, 255)  # White
    muted_color = RGBColor(136, 146, 176)  # Light Slate Gray
    card_bg_color = RGBColor(23, 42, 69)   # Light Navy for cards
    
    # Helper to set solid background color
    def set_background(slide):
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = bg_color
        
    # Helper to create a text box with custom options
    def add_textbox(slide, left, top, width, height, margin=0):
        txBox = slide.shapes.add_textbox(left, top, width, height)
        tf = txBox.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(margin)
        tf.margin_right = Inches(margin)
        tf.margin_top = Inches(margin)
        tf.margin_bottom = Inches(margin)
        return txBox, tf

    # Helper to add standard header
    def add_header(slide, title_text, category_text="PITCH DECK"):
        # Category/Tracker text
        txBox, tf = add_textbox(slide, Inches(0.8), Inches(0.4), Inches(11.7), Inches(0.4))
        p = tf.paragraphs[0]
        p.text = category_text.upper()
        p.font.name = 'Arial'
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = accent_color
        
        # Title text
        txBox2, tf2 = add_textbox(slide, Inches(0.8), Inches(0.7), Inches(11.7), Inches(0.8))
        p2 = tf2.paragraphs[0]
        p2.text = title_text
        p2.font.name = 'Arial'
        p2.font.size = Pt(28)
        p2.font.bold = True
        p2.font.color.rgb = white_color

    blank_layout = prs.slide_layouts[6] # Blank slide layout

    # ----------------------------------------------------
    # SLIDE 1: Cover & Vision
    # ----------------------------------------------------
    slide = prs.slides.add_slide(blank_layout)
    set_background(slide)
    
    # Add a decorative line or shape
    shape = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(2.2), Inches(3.0), Inches(0.08)
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = accent_color
    shape.line.color.rgb = accent_color

    # Title & Subtitle text box
    _, tf = add_textbox(slide, Inches(0.8), Inches(2.5), Inches(11.7), Inches(4.0))
    
    p_title = tf.paragraphs[0]
    p_title.text = "HariKerja HRMS"
    p_title.font.name = 'Arial'
    p_title.font.size = Pt(54)
    p_title.font.bold = True
    p_title.font.color.rgb = white_color
    p_title.space_after = Pt(20)
    
    p_sub = tf.add_paragraph()
    p_sub.text = "Democratizing HR Digitization for UMK, UMM, and Enterprise Tiers with Flat-Tier Pricing."
    p_sub.font.name = 'Arial'
    p_sub.font.size = Pt(20)
    p_sub.font.color.rgb = muted_color
    p_sub.space_after = Pt(40)
    
    p_desc = tf.add_paragraph()
    p_desc.text = "A modern, highly secure multi-tenant platform targeting a 1.5 Million Active User milestone by making enterprise-grade features affordable across all business scales."
    p_desc.font.name = 'Arial'
    p_desc.font.size = Pt(14)
    p_desc.font.color.rgb = accent_color

    # ----------------------------------------------------
    # SLIDE 2: The Problem
    # ----------------------------------------------------
    slide = prs.slides.add_slide(blank_layout)
    set_background(slide)
    add_header(slide, "The HR Tax on Company Growth")
    
    # Two Column Layout: Left Column = Problem Description, Right Column = Visual comparison/points
    # Left Card
    shape_left = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8))
    shape_left.fill.solid()
    shape_left.fill.fore_color.rgb = card_bg_color
    shape_left.line.fill.background()
    _, tf_left = add_textbox(slide, Inches(1.1), Inches(2.1), Inches(5.0), Inches(4.2))
    
    p = tf_left.paragraphs[0]
    p.text = "The Scaling Penalty"
    p.font.name = 'Arial'
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = accent_color
    p.space_after = Pt(15)
    
    p2 = tf_left.add_paragraph()
    p2.text = "Existing HRIS leaders in Indonesia (such as Mekari Talenta or Gadjian) utilize a Per-Employee pricing model."
    p2.font.name = 'Arial'
    p2.font.size = Pt(15)
    p2.font.color.rgb = white_color
    p2.space_after = Pt(15)
    
    p3 = tf_left.add_paragraph()
    p3.text = "As a business grows, its HR software costs grow linearly. This directly penalizes expansion and makes premium HR tools cost-prohibitive across UMK, UMM, and Enterprise segments."
    p3.font.name = 'Arial'
    p3.font.size = Pt(15)
    p3.font.color.rgb = white_color
    
    # Right Card
    shape_right = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.8), Inches(5.7), Inches(4.8))
    shape_right.fill.solid()
    shape_right.fill.fore_color.rgb = card_bg_color
    shape_right.line.fill.background()
    _, tf_right = add_textbox(slide, Inches(7.1), Inches(2.1), Inches(5.1), Inches(4.2))
    
    p_r = tf_right.paragraphs[0]
    p_r.text = "The Manual Alternative"
    p_r.font.name = 'Arial'
    p_r.font.size = Pt(20)
    p_r.font.bold = True
    p_r.font.color.rgb = white_color
    p_r.space_after = Pt(15)
    
    p_r2 = tf_right.add_paragraph()
    p_r2.text = "• Spreadsheet Dependency: Over 80% of UMK & UMM businesses rely on manual spreadsheets to manage employee data, attendance, and leave records."
    p_r2.font.name = 'Arial'
    p_r2.font.size = Pt(14)
    p_r2.font.color.rgb = muted_color
    p_r2.space_after = Pt(12)
    
    p_r3 = tf_right.add_paragraph()
    p_r3.text = "• Compliance Risk: Manual handling of complex BPJS contributions and the latest 2024 PPh 21 TER tax regulations leads to severe compliance errors and financial audits."
    p_r3.font.name = 'Arial'
    p_r3.font.size = Pt(14)
    p_r3.font.color.rgb = muted_color

    # ----------------------------------------------------
    # SLIDE 3: The Solution
    # ----------------------------------------------------
    slide = prs.slides.add_slide(blank_layout)
    set_background(slide)
    add_header(slide, "HariKerja: Flat-Rate Enterprise HRMS")
    
    # Three features cards
    col_width = Inches(3.64)
    gap = Inches(0.4)
    top_pos = Inches(1.8)
    height = Inches(4.8)
    
    features = [
        {
            "title": "Disruptive Flat Pricing",
            "desc": "Instead of per-employee pricing, we offer standard flat-rate plans starting at just Rp 125,000 /month. Businesses scale without scaling their software expenses.",
            "sub": "75% more cost-effective across all tiers"
        },
        {
            "title": "Localized Compliance",
            "desc": "Fully localized module for Indonesian regulations including BPJS Health & Employment, plus automated calculations for the latest PPh 21 TER tax rules.",
            "sub": "Zero-Config Compliance Engine"
        },
        {
            "title": "Modern ESS Mobile",
            "desc": "Native Flutter mobile app featuring offline attendance resilience, coordinate-based smart geofencing, face recognition logging, and secure digital payslips.",
            "sub": "Employee Self-Service (ESS)"
        }
    ]
    
    for i, f in enumerate(features):
        left_pos = Inches(0.8) + i * (col_width + gap)
        shape_card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left_pos, top_pos, col_width, height)
        shape_card.fill.solid()
        shape_card.fill.fore_color.rgb = card_bg_color
        shape_card.line.fill.background()
        
        _, tf_card = add_textbox(slide, left_pos + Inches(0.25), top_pos + Inches(0.3), col_width - Inches(0.5), height - Inches(0.6))
        
        # Header
        p_ch = tf_card.paragraphs[0]
        p_ch.text = f["title"]
        p_ch.font.name = 'Arial'
        p_ch.font.size = Pt(18)
        p_ch.font.bold = True
        p_ch.font.color.rgb = accent_color
        p_ch.space_after = Pt(15)
        
        # Desc
        p_cd = tf_card.add_paragraph()
        p_cd.text = f["desc"]
        p_cd.font.name = 'Arial'
        p_cd.font.size = Pt(14)
        p_cd.font.color.rgb = white_color
        p_cd.space_after = Pt(20)
        
        # Sub
        p_cs = tf_card.add_paragraph()
        p_cs.text = f["sub"]
        p_cs.font.name = 'Arial'
        p_cs.font.size = Pt(12)
        p_cs.font.italic = True
        p_cs.font.color.rgb = muted_color

    # ----------------------------------------------------
    # SLIDE 4: Market Segmentation & Quotas
    # ----------------------------------------------------
    slide = prs.slides.add_slide(blank_layout)
    set_background(slide)
    add_header(slide, "Market Segmentation & Quotas")
    
    # Left Column: Statistics / Text
    _, tf_m_left = add_textbox(slide, Inches(0.8), Inches(1.8), Inches(6.0), Inches(4.8))
    
    p = tf_m_left.paragraphs[0]
    p.text = "Subscription Plan Strategy"
    p.font.name = 'Arial'
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = white_color
    p.space_after = Pt(15)
    
    p2 = tf_m_left.add_paragraph()
    p2.text = "• UMK Segment (Essential): Flat Rp 125k/mo. Quota base of 25 seats up to max 100 seats capacity limit."
    p2.font.name = 'Arial'
    p2.font.size = Pt(14)
    p2.font.color.rgb = muted_color
    p2.space_after = Pt(12)
    
    p3 = tf_m_left.add_paragraph()
    p3.text = "• UMM Segment (Professional): Flat Rp 350k/mo. Quota base of 100 seats up to max 1,000 seats capacity limit."
    p3.font.name = 'Arial'
    p3.font.size = Pt(14)
    p3.font.color.rgb = muted_color
    p3.space_after = Pt(12)
    
    p4 = tf_m_left.add_paragraph()
    p4.text = "• Enterprise Segment (Premium): Flat Rp 1.5M/mo. Quota base of 500 seats up to max 999,999 seats capacity limit."
    p4.font.name = 'Arial'
    p4.font.size = Pt(14)
    p4.font.color.rgb = accent_color
    p4.space_after = Pt(12)

    p5 = tf_m_left.add_paragraph()
    p5.text = "• Large Enterprise: Custom plans from Rp 5M/mo. Base 2,000+ seats, custom storage, dedicated instances."
    p5.font.name = 'Arial'
    p5.font.size = Pt(14)
    p5.font.color.rgb = white_color
    
    # Right Column: A large callout block
    shape_callout = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7.5), Inches(1.8), Inches(5.0), Inches(4.8))
    shape_callout.fill.solid()
    shape_callout.fill.fore_color.rgb = card_bg_color
    shape_callout.line.fill.background()
    
    _, tf_callout = add_textbox(slide, Inches(7.8), Inches(2.2), Inches(4.4), Inches(4.0))
    
    p_num = tf_callout.paragraphs[0]
    p_num.text = "1,500,000"
    p_num.font.name = 'Arial'
    p_num.font.size = Pt(60)
    p_num.font.bold = True
    p_num.font.color.rgb = accent_color
    p_num.alignment = PP_ALIGN.CENTER
    p_num.space_after = Pt(5)
    
    p_lbl = tf_callout.add_paragraph()
    p_lbl.text = "Active Users Target"
    p_lbl.font.name = 'Arial'
    p_lbl.font.size = Pt(18)
    p_lbl.font.bold = True
    p_lbl.font.color.rgb = white_color
    p_lbl.alignment = PP_ALIGN.CENTER
    p_lbl.space_after = Pt(20)
    
    p_sublbl = tf_callout.add_paragraph()
    p_sublbl.text = "Achieved by capturing just ~3% of Indonesia's 50-60M formal workforce across all business sizes."
    p_sublbl.font.name = 'Arial'
    p_sublbl.font.size = Pt(14)
    p_sublbl.font.color.rgb = muted_color
    p_sublbl.alignment = PP_ALIGN.CENTER

    # ----------------------------------------------------
    # SLIDE 5: Business Model & Projections
    # ----------------------------------------------------
    # SLIDE 5: 1M Active Users Scaling Scenarios
    # ----------------------------------------------------
    slide = prs.slides.add_slide(blank_layout)
    set_background(slide)
    add_header(slide, "1.5M Active Users Scaling Scenarios")
    
    # Three column layout of three targets:
    # 1. ARPU, 2. UMK-Dominant, 3. Enterprise-Dominant
    col_w = Inches(3.64)
    gap = Inches(0.4)
    top_y = Inches(1.8)
    h = Inches(4.8)
    
    columns_data = [
        {
            "title": "Blueprint baseline (Rp 4.83B MRR)",
            "stat": "Rp 4.83 Billion",
            "subtitle": "Gross Revenue / Month",
            "points": [
                "Requires: 20,250 Tenants",
                "UMK (Essential): 15,000 tenants",
                "UMM (Professional): 4,500 tenants",
                "Enterprise (Premium): 675 tenants",
                "Dedicated (Large): 75 tenants",
                "Gross Margin: 70% - 80%",
                "Aligned with business blueprint"
            ]
        },
        {
            "title": "UMK-Dominant (Rp 7.65B MRR)",
            "stat": "Rp 7.65 Billion",
            "subtitle": "Gross Revenue / Month",
            "points": [
                "Requires: 44,040 Tenants",
                "UMK (Essential): 37,500 tenants",
                "UMM (Professional): 6,000 tenants",
                "Enterprise (Premium): 525 tenants",
                "Dedicated (Large): 15 tenants",
                "High-volume focus"
            ]
        },
        {
            "title": "Enterprise-Dominant (Rp 4.95B MRR)",
            "stat": "Rp 4.95 Billion",
            "subtitle": "Gross Revenue / Month",
            "points": [
                "Requires: 12,840 Tenants",
                "UMK (Essential): 7,500 tenants",
                "UMM (Professional): 3,750 tenants",
                "Enterprise (Premium): 1,500 tenants",
                "Dedicated (Large): 90 tenants",
                "High-value focus"
            ]
        }
    ]
    
    for i, c in enumerate(columns_data):
        left_x = Inches(0.8) + i * (col_w + gap)
        shape_col = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left_x, top_y, col_w, h)
        shape_col.fill.solid()
        shape_col.fill.fore_color.rgb = card_bg_color
        shape_col.line.fill.background()
        
        _, tf_col = add_textbox(slide, left_x + Inches(0.2), top_y + Inches(0.2), col_w - Inches(0.4), h - Inches(0.4))
        
        # Title
        p_t = tf_col.paragraphs[0]
        p_t.text = c["title"]
        p_t.font.name = 'Arial'
        p_t.font.size = Pt(16)
        p_t.font.bold = True
        p_t.font.color.rgb = white_color
        p_t.space_after = Pt(10)
        
        # Stat
        p_s = tf_col.add_paragraph()
        p_s.text = c["stat"]
        p_s.font.name = 'Arial'
        p_s.font.size = Pt(32)
        p_s.font.bold = True
        p_s.font.color.rgb = accent_color
        p_s.space_after = Pt(2)
        
        # Subtitle
        p_sub = tf_col.add_paragraph()
        p_sub.text = c["subtitle"]
        p_sub.font.name = 'Arial'
        p_sub.font.size = Pt(12)
        p_sub.font.color.rgb = muted_color
        p_sub.space_after = Pt(15)
        
        # Points
        for pt in c["points"]:
            p_p = tf_col.add_paragraph()
            p_p.text = "• " + pt
            p_p.font.name = 'Arial'
            p_p.font.size = Pt(11)
            p_p.font.color.rgb = white_color
            p_p.space_after = Pt(6)

    # ----------------------------------------------------
    # SLIDE 6: Go-to-Market Strategy
    # ----------------------------------------------------
    slide = prs.slides.add_slide(blank_layout)
    set_background(slide)
    add_header(slide, "Go-To-Market & Growth Strategy")
    
    # Left Box
    shape_l = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8))
    shape_l.fill.solid()
    shape_l.fill.fore_color.rgb = card_bg_color
    shape_l.line.fill.background()
    _, tf_l = add_textbox(slide, Inches(1.1), Inches(2.1), Inches(5.0), Inches(4.2))
    
    p = tf_l.paragraphs[0]
    p.text = "B2B Acquisition Engine"
    p.font.name = 'Arial'
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = accent_color
    p.space_after = Pt(15)
    
    p2 = tf_l.add_paragraph()
    p2.text = "• Search Engine Capture: Focus marketing spend (Rp 20M–500M) on high-intent search keywords (e.g. 'Aplikasi Payroll', 'HRIS Murah', 'TER PPh 21')."
    p2.font.name = 'Arial'
    p2.font.size = Pt(14)
    p2.font.color.rgb = white_color
    p2.space_after = Pt(15)
    
    p3 = tf_l.add_paragraph()
    p3.text = "• Retargeting Loops: Use Meta and LinkedIn retargeting to maintain top-of-mind recall with HR leaders who visited but didn't convert."
    p3.font.name = 'Arial'
    p3.font.size = Pt(14)
    p3.font.color.rgb = white_color
    p3.space_after = Pt(15)
    
    p4 = tf_l.add_paragraph()
    p4.text = "• Educational Content: Drive organic signups by providing compliance calculators and tax guides."
    p4.font.name = 'Arial'
    p4.font.size = Pt(14)
    p4.font.color.rgb = white_color
    
    # Right Box
    shape_r = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.8), Inches(5.7), Inches(4.8))
    shape_r.fill.solid()
    shape_r.fill.fore_color.rgb = card_bg_color
    shape_r.line.fill.background()
    _, tf_r = add_textbox(slide, Inches(7.1), Inches(2.1), Inches(5.1), Inches(4.2))
    
    p_r = tf_r.paragraphs[0]
    p_r.text = "Product-Led Retention"
    p_r.font.name = 'Arial'
    p_r.font.size = Pt(20)
    p_r.font.bold = True
    p_r.font.color.rgb = white_color
    p_r.space_after = Pt(15)
    
    p_r2 = tf_r.add_paragraph()
    p_r2.text = "• Self-Service Onboarding: Automated tenant provisioning and database seeding enable instant trial generation, lowering sales costs."
    p_r2.font.name = 'Arial'
    p_r2.font.size = Pt(14)
    p_r2.font.color.rgb = muted_color
    p_r2.space_after = Pt(15)
    
    p_r3 = tf_r.add_paragraph()
    p_r3.text = "• High Retention (Sticky Product): HRMS products are fundamentally sticky. Once a company embeds its core payroll, attendance, and team configuration in HariKerja, churn remains extremely low."
    p_r3.font.name = 'Arial'
    p_r3.font.size = Pt(14)
    p_r3.font.color.rgb = muted_color

    # ----------------------------------------------------
    # SLIDE 7: Technology & Security
    # ----------------------------------------------------
    slide = prs.slides.add_slide(blank_layout)
    set_background(slide)
    add_header(slide, "Secure & Scalable Multi-Tenant Architecture")
    
    # Text content on left, technology stack highlights on right
    _, tf_tech_left = add_textbox(slide, Inches(0.8), Inches(1.8), Inches(6.0), Inches(4.8))
    
    p = tf_tech_left.paragraphs[0]
    p.text = "Enterprise-Grade Infrastructure"
    p.font.name = 'Arial'
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = white_color
    p.space_after = Pt(15)
    
    p2 = tf_tech_left.add_paragraph()
    p2.text = "• Database Level Security: Hard PostgreSQL schema-per-tenant isolation guarantees zero possibility of cross-tenant data leaks."
    p2.font.name = 'Arial'
    p2.font.size = Pt(15)
    p2.font.color.rgb = muted_color
    p2.space_after = Pt(12)
    
    p3 = tf_tech_left.add_paragraph()
    p3.text = "• Gateway Whitelisting: Django Admin backend is restricted at Nginx level and accessible only via Private OpenVPN/WireGuard gateways."
    p3.font.name = 'Arial'
    p3.font.size = Pt(15)
    p3.font.color.rgb = muted_color
    p3.space_after = Pt(12)
    
    p4 = tf_tech_left.add_paragraph()
    p4.text = "• Multi-Factor Authentication: Secure login flow enforces 6-digit TOTP (Google Authenticator) verification for all administrative actions."
    p4.font.name = 'Arial'
    p4.font.size = Pt(15)
    p4.font.color.rgb = accent_color
    
    # Right Column: Visual highlights of stack
    shape_stack = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7.5), Inches(1.8), Inches(5.0), Inches(4.8))
    shape_stack.fill.solid()
    shape_stack.fill.fore_color.rgb = card_bg_color
    shape_stack.line.fill.background()
    
    _, tf_stack = add_textbox(slide, Inches(7.8), Inches(2.1), Inches(4.4), Inches(4.2))
    
    p_st = tf_stack.paragraphs[0]
    p_st.text = "Technology Stack"
    p_st.font.name = 'Arial'
    p_st.font.size = Pt(20)
    p_st.font.bold = True
    p_st.font.color.rgb = white_color
    p_st.space_after = Pt(15)
    
    techs = [
        ("Backend Framework", "Django (Python) & Django REST Framework"),
        ("Database & Cache", "PostgreSQL (Multi-tenant) & Redis Cache"),
        ("Frontend & Portal", "Next.js (React) & Vanilla CSS"),
        ("Mobile Client", "Flutter (iOS & Android) with Offline Cache"),
        ("Security Gateways", "Nginx, UFW, OpenVPN, WireGuard")
    ]
    
    for t_title, t_desc in techs:
        p_title = tf_stack.add_paragraph()
        p_title.text = f"• {t_title}:"
        p_title.font.name = 'Arial'
        p_title.font.size = Pt(13)
        p_title.font.bold = True
        p_title.font.color.rgb = accent_color
        
        p_desc = tf_stack.add_paragraph()
        p_desc.text = f"  {t_desc}"
        p_desc.font.name = 'Arial'
        p_desc.font.size = Pt(12)
        p_desc.font.color.rgb = white_color
        p_desc.space_after = Pt(8)

    # ----------------------------------------------------
    # SLIDE 8: Call to Action & Team
    # ----------------------------------------------------
    slide = prs.slides.add_slide(blank_layout)
    set_background(slide)
    add_header(slide, "Partner with HariKerja", "CALL TO ACTION")
    
    # Large centered text
    _, tf_cta = add_textbox(slide, Inches(1.5), Inches(2.2), Inches(10.3), Inches(4.0))
    
    p_ask = tf_cta.paragraphs[0]
    p_ask.text = "Let's Scale HariKerja Together"
    p_ask.font.name = 'Arial'
    p_ask.font.size = Pt(36)
    p_ask.font.bold = True
    p_ask.font.color.rgb = accent_color
    p_ask.alignment = PP_ALIGN.CENTER
    p_ask.space_after = Pt(20)
    
    p_text = tf_cta.add_paragraph()
    p_text.text = "Seeking Seed Round of Rp 3,600,000,000 for 12.5% Equity (Post-Money Valuation: Rp 28,800,000,000 / $1.8M USD) to secure a 24-month runway, procure core work tools (MacBook Pro/Air & testing devices), expand professional engineering & sales teams, and reach profitability."
    p_text.font.name = 'Arial'
    p_text.font.size = Pt(18)
    p_text.font.color.rgb = white_color
    p_text.alignment = PP_ALIGN.CENTER
    p_text.space_after = Pt(40)
    
    p_contact = tf_cta.add_paragraph()
    p_contact.text = "Contact: info@harikerja.web.id  |  Website: https://harikerja.web.id (QA) / HariKerja.com (Prod)"
    p_contact.font.name = 'Arial'
    p_contact.font.size = Pt(16)
    p_contact.font.bold = True
    p_contact.font.color.rgb = muted_color
    p_contact.alignment = PP_ALIGN.CENTER
    
    prs.save("/home/afdhal/data/hr/hrms/docs/business_strategy/east_ventures_pitch_deck.pptx")
    print("Presentation (.pptx) created successfully!")

    # Generate PDF using LibreOffice headless command
    import subprocess
    try:
        print("Converting PPTX to PDF via LibreOffice...")
        subprocess.run([
            "libreoffice", "--headless", "--convert-to", "pdf",
            "--outdir", "/home/afdhal/data/hr/hrms/docs/business_strategy",
            "/home/afdhal/data/hr/hrms/docs/business_strategy/east_ventures_pitch_deck.pptx"
        ], check=True)
        print("PDF created successfully!")
    except Exception as e:
        print(f"Error during PDF conversion: {e}")

if __name__ == '__main__':
    create_presentation()
