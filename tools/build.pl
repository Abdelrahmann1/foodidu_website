#!/usr/bin/perl
# Foodidu static site builder.
#   perl tools/build.pl        -> regenerates public/ from data/, content/ and static/
# Every page is pre-rendered HTML (EN at /, AR at /ar/) with canonical, hreflang,
# Open Graph, JSON-LD and a sitemap, so search engines read everything without JS.
use strict; use warnings; use utf8;
use JSON::PP ();
use File::Path qw(make_path remove_tree);
use File::Find ();
use File::Basename qw(dirname basename);
use Cwd qw(abs_path);
use Digest::MD5 qw(md5_hex);
use POSIX qw(strftime);
use Time::Local qw(timegm);
binmode STDOUT, ':encoding(UTF-8)';

my $ROOT  = abs_path(dirname(abs_path(__FILE__)) . '/..');
my $OUT   = "$ROOT/public";
my $SITE  = 'https://foodidu.com';
my @LANGS = ('en', 'ar');
my $NOW   = time;
my $YEAR  = strftime('%Y', gmtime $NOW);
my $FORM_URL = 'https://script.google.com/macros/s/AKfycbyxKza22srkcMWv5bFGp4ZzQ0ulZaVc29RV_8brZ6l_Zih_rxz0tdMCHrM_CDvQ84-d/exec';
my @SOCIAL = (
  ['facebook',  'Facebook',  'https://www.facebook.com/Foodidu.EG'],
  ['instagram', 'Instagram', 'https://www.instagram.com/foodidu_official'],
  ['tiktok',    'TikTok',    'https://www.tiktok.com/@foodidu_'],
  ['linkedin',  'LinkedIn',  'https://www.linkedin.com/company/foodidu/'],
);

my $PLAY_URL = 'https://play.google.com/store/apps/details?id=com.fooddidu.app';
my $LOGO = '/img/foodidu-logo.svg';   # the "welcome to Foodidu" brand logo, 767x304

sub slurp { my ($f, $raw) = @_; open my $fh, ($raw ? '<:raw' : '<:encoding(UTF-8)'), $f or die "read $f: $!"; local $/; my $s = <$fh>; close $fh; $s }
sub spit  { my ($f, $s, $raw) = @_; make_path(dirname($f)); open my $fh, ($raw ? '>:raw' : '>:encoding(UTF-8)'), $f or die "write $f: $!"; print $fh $s; close $fh }
sub mdate {                             # last commit date of a file (stable across checkouts); if it has uncommitted edits, its mtime
  my $f = shift;
  my $dirty = `git -C "$ROOT" status --porcelain -- "$f" 2>/dev/null`;
  my $d = $dirty ? '' : `git -C "$ROOT" log -1 --format=%cs -- "$f" 2>/dev/null`; chomp $d;
  return $d =~ /^\d{4}-\d\d-\d\d$/ ? $d : strftime('%Y-%m-%d', localtime((stat $f)[9]));   # local date, like git %cs
}

my $DATA   = JSON::PP->new->utf8->decode(slurp("$ROOT/data/brands.json", 1));
my @BRANDS = @{ $DATA->{brands} };
# "priority": "low" brands go to the end of every list (codes page, home cards, related codes, footer, search)
@BRANDS = ((grep { ($_->{priority} // '') ne 'low' } @BRANDS), (grep { ($_->{priority} // '') eq 'low' } @BRANDS));
my %CATN   = %{ $DATA->{categories} };
my @CATS   = qw(restaurants groceries shopping);
my %CATICON = (restaurants => 'fork', groceries => 'basket', shopping => 'bag');
my $DATA_DATE = mdate("$ROOT/data/brands.json");
my $DD_FILE = "$ROOT/data/day-deals.json";
my @DDEALS = -f $DD_FILE ? @{ JSON::PP->new->utf8->decode(slurp($DD_FILE, 1))->{deals} // [] } : ();
my $DD_DATE = -f $DD_FILE ? mdate($DD_FILE) : $DATA_DATE;
my @DAYS = qw(sat sun mon tue wed thu fri);   # Egyptian week starts on Saturday
my %DAYI = map { ($DAYS[$_] => $_) } 0 .. $#DAYS;
my %DSHORT = (
  en => { sat => 'Sat', sun => 'Sun', mon => 'Mon', tue => 'Tue', wed => 'Wed', thu => 'Thu', fri => 'Fri' },
  ar => { sat => 'سبت', sun => 'أحد', mon => 'اثنين', tue => 'ثلاثاء', wed => 'أربعاء', thu => 'خميس', fri => 'جمعة' },
);
my %DAYN = (
  en => { sat => 'Saturday', sun => 'Sunday', mon => 'Monday', tue => 'Tuesday', wed => 'Wednesday', thu => 'Thursday', fri => 'Friday' },
  ar => { sat => 'السبت', sun => 'الأحد', mon => 'الاثنين', tue => 'الثلاثاء', wed => 'الأربعاء', thu => 'الخميس', fri => 'الجمعة' },
);
my $RO_FILE = "$ROOT/data/restaurant-offers.json";
my @RESTS = -f $RO_FILE ? @{ JSON::PP->new->utf8->decode(slurp($RO_FILE, 1))->{restaurants} // [] } : ();
my $RO_DATE = -f $RO_FILE ? mdate($RO_FILE) : $DATA_DATE;
my $FT_FILE = "$ROOT/data/featured.json";
my $FEAT = -f $FT_FILE ? JSON::PP->new->utf8->decode(slurp($FT_FILE, 1)) : {};
my $HOME_FILE = "$ROOT/data/home.json";
my $HOME = -f $HOME_FILE ? JSON::PP->new->utf8->decode(slurp($HOME_FILE, 1)) : {};
my $TODAY = strftime('%Y-%m-%d', localtime $NOW);
my %DAYC = (   # calendar block: "Every Tuesday" / "كل ثلاثاء" (Arabic without the article)
  en => $DAYN{en},
  ar => { sat => 'سبت', sun => 'أحد', mon => 'اثنين', tue => 'ثلاثاء', wed => 'أربعاء', thu => 'خميس', fri => 'جمعة' },
);

# ------------------------------------------------------------------ strings
my %S = (
 en => {
  skip => 'Skip to content', home => 'Home', menu => 'Menu', mainnav => 'Main',
  nav_codes => 'Promo codes', nav_rest => 'Restaurants', nav_groc => 'Groceries', nav_shop => 'Shopping', nav_partner => 'For restaurants',
  copy => 'Copy', copy_code => 'Copy code', copied => 'Copied', copy_aria => 'Copy code {code}',
  copiedToast => 'Code {code} copied. Paste it at checkout.', copyFail => "Couldn't copy. Select the code and copy it manually.",
  details => 'Details', exclusive => 'Exclusive', eg => 'Egypt', gcc => 'GCC', all => 'All', all_regions => 'All countries',
  noResults => 'No codes found for that brand yet.', search_label => 'Search for a brand', search_ph => 'Search KFC, noon, Rabbit…', search_btn => 'Search',
  sending => 'Sending…', formOk => 'Thank you! Your application was sent. Our team will contact you soon.',
  formErr => "Sorry, we couldn't send your application. Please try again in a moment.",
  logo_alt => '{name} logo',
  foot_blurb => 'Promo codes and discounts for restaurants, groceries and online shopping in Egypt and the GCC.',
  foot_codes => 'Promo codes', foot_code_link => '{name} promo code', foot_all => 'All promo codes', privacy => 'Privacy policy', terms => 'Terms & conditions',
  cookie_settings => 'Cookie settings', made => 'Made with love for food lovers.', disclaimer => 'Brand names and logos belong to their owners.',
  cookie_text => 'We use cookies to understand how Foodidu is used and to improve it.', accept => 'Accept', decline => 'Decline', cookies => 'Cookies',
  # home
  h_title => 'Foodidu – Promo Codes & Discounts in Egypt and the GCC',
  h_desc => 'Promo codes for KFC, Pizza Hut, noon, Rabbit, Breadfast and more, all in one place and in Arabic and English. Copy a code, check the conditions and save.',
  h_display => 'Every bite,<br> <em>a better price</em>',
  h_lede => 'Copy promo codes for KFC, Pizza Hut, Rabbit, noon and more, with the conditions spelled out before you order. Free, no sign-up.',
  h_fact_region => 'Egypt & GCC', h_fact_free => 'Free, no sign-up', h_top => 'Top codes', h_swipe => 'Swipe',
  h_cat_eyebrow => 'Browse by category', h_cat_title => 'What are you ordering?',
  h_feat_eyebrow => 'Featured codes', h_feat_title => 'Our top codes', h_feat_sub => 'Tap a code to copy it, then paste it at checkout.', h_see_all => 'See all {n} codes',
  h_brands_eyebrow => 'Brands', h_brands_title => 'Every brand on Foodidu', h_brands_sub => 'Tap a brand to see its codes and how to use them.',
  h_how_eyebrow => 'How it works', h_how_title => 'Saving takes three taps',
  h_s1 => 'Find your brand', h_s1p => 'Search or browse restaurants, grocery apps and online stores.',
  h_s2 => 'Copy the code', h_s2p => 'One tap copies it. The conditions are right there, so there are no surprises.',
  h_s3 => 'Paste & save', h_s3p => "Paste it at checkout in the brand's app or website and enjoy the discount.",
  h_why_eyebrow => 'Why Foodidu', h_why_title => 'Made for people who love a good deal',
  h_w1 => 'All in one place', h_w1p => 'Codes for restaurants, grocery delivery and online shopping, together on one site.',
  h_w2 => 'Conditions up front', h_w2p => "Every code shows what it's for: first order, minimum amount or app only.",
  h_w3 => 'Arabic & English', h_w3p => "Use Foodidu in the language you're most comfortable with.",
  h_w4 => 'Free, no sign-up', h_w4p => "You don't need an account to use a code. Just copy and save.",
  home_logo => 'Foodidu home', menu_more => 'Language & app',
  app_eyebrow => 'The Foodidu app', app_title => 'Discover restaurants and food near you',
  app_sub => 'Browse restaurants and cafés around you, check opening hours and menus, and catch limited-time offers, all in one app.',
  app_f1 => 'Restaurants near you', app_f1p => 'Browse restaurants and cafés based on your location.',
  app_f2 => 'Hours & offers', app_f2p => 'Check opening hours and the special offers each place has.',
  app_f3 => 'Limited-time deals', app_f3p => 'Catch exclusive promotions and discounts before they end.',
  app_f4 => 'Menus before you go', app_f4p => 'Explore the menu before you visit, so you know what to order.',
  gp_small => 'Get it on', gp_big => 'Google Play', as_small => 'Coming soon on', as_big => 'App Store', foot_app => 'Get the app',
  dd_nav => 'Day deals', dd_eyebrow => 'Weekly day deals', dd_title => 'Deals that come back every week',
  dd_sub => "Some brands run a special offer on a fixed day of the week. Here's what's on and when.",
  dd_all => 'All day deals', dd_every => 'Every', dd_today => 'Today!', dd_source => 'Source',
  dd_note => "Prices can change, so check the brand's app before you order.",
  dd_page_title => 'Weekly Day Deals: {brand} {day} Offer & More', dd_page_title0 => 'Weekly Day Deals in Egypt',
  dd_page_desc => 'Restaurant offers that come back on the same day every week, like the {brand} {day} offer. See each day\'s deals and where each offer comes from.',
  dd_h1 => 'Weekly day deals', dd_lede => "Offers that come back on the same day every week. We add each one from the brand's official page and link to it.",
  dd_day_h2 => '{day} deals', dd_q => 'What is the {brand} {day} offer?', dd_brand_h2 => '{brand} {day} offer',
  dd_know => 'Know a weekly deal we missed?', dd_know_p => "Send it to us on Facebook or Instagram and we'll add it after checking the brand's official page.",
  dd_empty => 'No day deals yet. Check back soon.',
  ro_all => 'All {name} offers', ro_save => 'Save {p}%', ro_was => 'instead of {was}', egp => 'EGP', ro_from => 'from {min} EGP',
  ro_h1 => '{name} offers', ro_lede => '{count} from {min} EGP, saving up to {max}% on the menu price.',
  ro_checked => 'Prices checked by Foodidu on {date}', ro_order => 'Order from {name}', ro_call => 'Call {phone}',
  ro_how => 'How to order {name} offers', ro_s1 => "Open {name}'s menu", ro_s1p => 'On the website, go to the Offers section.',
  ro_s2 => 'Pick your offer', ro_s2p => 'Add the offer you want to your cart.', ro_s3 => 'Order or call', ro_s3p => 'Check out online or call {phone} to order.',
  ro_q1 => 'What are the {name} offers?', ro_a1 => '{name} currently lists {count} on its menu: {list}.',
  ro_q2 => 'What is the cheapest {name} offer?', ro_a2 => '{offer} for {price} EGP: {items}.',
  ro_q3 => 'How do I order {name} offers?', ro_a3 => 'From the Offers section of the {name} menu online, or by calling {phone}.',
  ro_q4 => 'Do the prices change?', ro_a4 => 'These prices are from the official {name} menu on {date} and can change, so check the menu before you order.',
  ro_src => 'Prices from the official {name} menu. They can change.', ro_valid => 'Offers valid until {date}',
  ft_label => 'Featured offer', ft_sponsored => 'Sponsored', ft_until => 'until {date}',
  ft_rest_title => '{name} offers: save up to {p}%', ft_rest_text => '{n} on the menu from {min} EGP', ft_rest_cta => 'See the offers',
  ft_code_title => '{name} promo code', ft_code_cta => 'Get the code',
  band_title => 'Own a restaurant or food brand?', band_text => 'Put your promo code in front of people who are about to order. Apply in two minutes and our team will get in touch.', band_btn => 'Partner with Foodidu',
  faq_eyebrow => 'FAQ', faq_title => 'Questions, answered',
  # codes page
  c_title => 'All Promo Codes: Restaurants, Groceries & Shopping',
  c_desc => 'Browse every Foodidu promo code in one list: restaurants like KFC and Pizza Hut, grocery apps like Rabbit and Breadfast, and noon for online shopping.',
  c_h1 => 'All promo codes', c_lede => 'Every Foodidu code in one place: {n} across restaurants, grocery apps and online shopping in Egypt and the GCC.',
  c_group_restaurants => 'Restaurant promo codes', c_group_groceries => 'Grocery promo codes', c_group_shopping => 'Online shopping promo codes',
  c_empty => 'No codes match this filter.', c_filters => 'Filter codes',
  # brand page
  b_h1 => '{name} promo code', b_f_region => 'Works in', b_f_where => 'Use it on', b_f_checked => 'Checked by Foodidu', b_f_cost => 'On Foodidu', b_go => 'Go to {name}',
  b_how => 'How to use your {name} code', b_st1 => 'Copy the code', b_st1p => 'Tap “Copy code” to copy {code}.',
  b_st2 => 'Open {where}', b_st2p => 'Add what you want to your cart as usual.',
  b_st3 => 'Paste it at checkout', b_st3p => 'Paste the code in the promo code or voucher field. The discount applies when your order meets the conditions.',
  b_about => 'About {name}', b_faq => '{name} code: FAQ',
  b_q1 => 'What is the {name} promo code?', b_a1 => 'The {name} code on Foodidu is {code}: {offer}.',
  b_q2 => 'How do I use the {name} code?', b_a2 => 'Copy {code}, open {where}, add your order to the cart and paste the code in the promo code field at checkout.',
  b_q3 => 'Are there any conditions?', b_q4 => "Why isn't the {name} code working?",
  b_a4 => 'Check that your order meets the conditions (for example first order only or a minimum amount) and that you typed the code exactly as shown. Offers are set by {name} and can change or end at any time. If it still fails, try another code on Foodidu.',
  b_note => 'Offers are set by {name} and can change or end without notice. Brand names and logos belong to their owners.',
  b_side_code => 'Your {name} code', b_side_cats => 'Browse by category', b_related => 'More {cat} codes', b_terms => 'Conditions',
  b_h1_multi => '{name} promo codes', b_side_codes => 'Your {name} codes', b_st1p_multi => 'Tap “Copy code” next to the code you want to use.',
  b_a1_multi => '{name} codes on Foodidu: {list}.', checked_short => 'Checked {date}', h_fact_checked => 'Checked {date}', h_fact_checked_n => '{n} codes checked {date}',
  cat_def_restaurants => 'restaurant', cat_def_groceries => 'grocery', cat_def_shopping => 'shopping',
  # partners
  p_title => "Partner with Foodidu: Promote Your Restaurant's Offers",
  p_desc => 'Own a restaurant, café or food brand in Egypt? Apply to list your promo code on Foodidu and reach people who are about to order.',
  p_h1 => 'Partner with Foodidu',
  p_lede => 'Own a restaurant, café, cloud kitchen or food brand? List your promo code on Foodidu and reach people who are looking for a deal right before they order.',
  p_cta => 'Apply now', p_v_eyebrow => 'Why partner', p_v_title => 'Get in front of hungry customers',
  p_v1 => 'Reach ready-to-order customers', p_v1p => "People visit Foodidu when they're about to order and want a better price. Your offer is in front of them at that moment.",
  p_v2 => 'Your own brand page', p_v2p => "A dedicated page for your code in Arabic and English, built to show up when people search for your brand's promo code.",
  p_v3 => 'You set the offer', p_v3p => 'Choose the discount, the conditions and how long it runs. Tell us when it changes and we update it.',
  p_how_title => 'How it works', p_s1 => 'Apply', p_s1p => 'Fill in the short form below.', p_s2 => 'We talk', p_s2p => 'Our team reviews your application and contacts you.', p_s3 => 'Go live', p_s3p => 'Your code and brand page go live on Foodidu.',
  p_form_title => 'Apply to become a partner', p_form_sub => 'Fields marked * are required.',
  f_business => 'Business name', f_contact => 'Contact person', f_contact_hint => 'Arabic or English letters only.', f_phone => 'Phone number', f_email => 'Email address',
  f_location => 'Business location', f_location_ph => 'e.g. Nasr City, Cairo', f_type => 'Business type', f_type_ph => 'Select business type',
  f_restaurant => 'Restaurant', f_cafe => 'Café', f_cloud => 'Cloud kitchen', f_truck => 'Food truck', f_bakery => 'Bakery', f_other => 'Other',
  f_desc => 'Tell us about your business', f_desc_ph => 'Your cuisine, branches and the offer you have in mind', f_web => 'Website or social page (optional)',
  f_submit => 'Send application', f_privacy => 'We only use these details to review your application.',
  p_q1 => 'What kind of businesses can apply?', p_a1 => 'Restaurants, cafés, cloud kitchens, food trucks, bakeries and other food businesses.',
  p_q2 => 'Do I need a website?', p_a2 => 'No. Your phone number and location are enough to apply. Add your website or social page if you have one.',
  p_q3 => 'Can I change my offer later?', p_a3 => "Yes. Tell us when your offer changes and we'll update your code and page.",
  p_q4 => 'Can my restaurant appear at the top of the home page?', p_a4 => 'Yes. The “Featured offer” spot right under the home page header shows one partner at a time. Mention it in your application and we will send you the details.',
  # legal
  pr_seo => 'Foodidu Privacy Policy: How We Use Your Data',
  pr_title => 'Privacy Policy', pr_desc => 'How Foodidu collects, uses and protects your information, which services we use, and the choices you have about cookies and your data.',
  te_seo => 'Foodidu Terms & Conditions for Using the Site',
  te_title => 'Terms & Conditions', te_desc => 'The terms that apply when you use Foodidu and its promo codes, including code availability, accuracy and your responsibilities.',
  updated => 'Last updated: {date}',
  # home faq
  q1 => 'What is Foodidu?', a1 => 'Foodidu is a free website that collects promo codes and discounts for restaurants, grocery apps and online shopping in Egypt and the GCC, in Arabic and English.',
  q2 => 'Is Foodidu free?', a2 => "Yes. You don't need an account. Copy any code and use it directly in the brand's app or website.",
  q3 => 'How do I use a promo code?', a3 => "Tap Copy on the code, open the brand's app or website, add your order to the cart and paste the code in the promo code field at checkout.",
  q4 => "Why didn't a code work?", a4 => 'Most codes have conditions, such as first order only or a minimum order amount, and brands can change or end offers at any time. Check the conditions on the code page and make sure you typed it exactly.',
  q5 => 'How can my restaurant appear on Foodidu?', a5 => 'Fill in the <a href="{partners}">partner application</a> and our team will contact you.',
 },
 ar => {
  skip => 'تخطَّ إلى المحتوى', home => 'الرئيسية', menu => 'القائمة', mainnav => 'القائمة الرئيسية',
  nav_codes => 'أكواد الخصم', nav_rest => 'مطاعم', nav_groc => 'بقالة', nav_shop => 'تسوق', nav_partner => 'للمطاعم',
  copy => 'انسخ', copy_code => 'انسخ الكود', copied => 'تم النسخ', copy_aria => 'انسخ الكود {code}',
  copiedToast => 'تم نسخ الكود {code}، الصقه عند الدفع.', copyFail => 'تعذّر النسخ، حدّد الكود وانسخه يدوياً.',
  details => 'التفاصيل', exclusive => 'حصري', eg => 'مصر', gcc => 'الخليج', all => 'الكل', all_regions => 'كل الدول',
  noResults => 'لا توجد أكواد لهذه العلامة حتى الآن.', search_label => 'ابحث عن علامة تجارية', search_ph => 'ابحث عن كنتاكي، نون، رابيت…', search_btn => 'بحث',
  sending => 'جارٍ الإرسال…', formOk => 'شكراً لك! تم إرسال طلبك، وسيتواصل معك فريقنا قريباً.',
  formErr => 'عذراً، تعذّر إرسال طلبك. حاول مرة أخرى بعد قليل.',
  logo_alt => 'شعار {name}',
  foot_blurb => 'أكواد وكوبونات خصم للمطاعم والبقالة والتسوق أونلاين في مصر والخليج.',
  foot_codes => 'أكواد الخصم', foot_code_link => 'كود خصم {name}', foot_all => 'كل أكواد الخصم', privacy => 'سياسة الخصوصية', terms => 'الشروط والأحكام',
  cookie_settings => 'إعدادات ملفات تعريف الارتباط', made => 'صُنع بحب لعشّاق الأكل.', disclaimer => 'أسماء وشعارات العلامات التجارية مملوكة لأصحابها.',
  cookie_text => 'نستخدم ملفات تعريف الارتباط لفهم كيفية استخدام Foodidu وتحسينه.', accept => 'موافق', decline => 'رفض', cookies => 'ملفات تعريف الارتباط',
  h_title => 'Foodidu – أكواد وكوبونات خصم في مصر والخليج',
  h_desc => 'أكواد خصم كنتاكي وبيتزا هت ونون ورابيت وبريدفاست وغيرها في مكان واحد وباللغتين. انسخ الكود واعرف الشروط ووفّر على طلبك القادم.',
  h_display => 'كل أكلة<br> <em>بسعر أحلى</em>',
  h_lede => 'انسخ أكواد خصم كنتاكي وبيتزا هت ورابيت ونون وغيرها، مع توضيح الشروط قبل أن تطلب. مجاناً وبدون تسجيل.',
  h_fact_region => 'مصر والخليج', h_fact_free => 'مجاني وبدون تسجيل', h_top => 'أقوى الأكواد', h_swipe => 'اسحب',
  h_cat_eyebrow => 'تصفّح حسب الفئة', h_cat_title => 'ماذا ستطلب اليوم؟',
  h_feat_eyebrow => 'أكواد مختارة', h_feat_title => 'أقوى الأكواد عندنا', h_feat_sub => 'اضغط على الكود لنسخه، ثم الصقه عند الدفع.', h_see_all => 'عرض كل الأكواد ({n})',
  h_brands_eyebrow => 'العلامات التجارية', h_brands_title => 'كل العلامات على Foodidu', h_brands_sub => 'اضغط على أي علامة لتشوف أكوادها وطريقة استخدامها.',
  h_how_eyebrow => 'كيف يعمل', h_how_title => 'التوفير في ثلاث خطوات',
  h_s1 => 'اختر العلامة', h_s1p => 'ابحث أو تصفّح المطاعم وتطبيقات البقالة والمتاجر أونلاين.',
  h_s2 => 'انسخ الكود', h_s2p => 'ضغطة واحدة تنسخه، والشروط أمامك حتى لا تتفاجأ.',
  h_s3 => 'الصق ووفّر', h_s3p => 'الصقه عند الدفع في تطبيق أو موقع العلامة التجارية واستمتع بالخصم.',
  h_why_eyebrow => 'لماذا Foodidu', h_why_title => 'لكل من يحب العروض الحلوة',
  h_w1 => 'كل الأكواد في مكان واحد', h_w1p => 'أكواد المطاعم وتوصيل البقالة والتسوق أونلاين معاً في موقع واحد.',
  h_w2 => 'الشروط واضحة', h_w2p => 'كل كود يوضّح شروطه: أول طلب، أو حد أدنى للطلب، أو على التطبيق فقط.',
  h_w3 => 'عربي وإنجليزي', h_w3p => 'استخدم Foodidu باللغة التي تفضّلها.',
  h_w4 => 'مجاني وبدون تسجيل', h_w4p => 'لا تحتاج إلى حساب لاستخدام أي كود، فقط انسخ ووفّر.',
  home_logo => 'الصفحة الرئيسية لـ Foodidu', menu_more => 'اللغة والتطبيق',
  app_eyebrow => 'تطبيق Foodidu', app_title => 'اكتشف المطاعم والأكل حواليك',
  app_sub => 'تصفّح المطاعم والكافيهات القريبة منك، واطّلع على مواعيد العمل والمنيو، واغتنم العروض المحدودة، كل ذلك في تطبيق واحد.',
  app_f1 => 'مطاعم قريبة منك', app_f1p => 'تصفّح المطاعم والكافيهات حسب موقعك.',
  app_f2 => 'مواعيد وعروض', app_f2p => 'اعرف مواعيد العمل والعروض الخاصة المتاحة في كل مكان.',
  app_f3 => 'عروض لفترة محدودة', app_f3p => 'استفد من الخصومات والعروض الحصرية قبل انتهائها.',
  app_f4 => 'المنيو قبل الزيارة', app_f4p => 'تصفّح قائمة الطعام قبل زيارتك لتعرف ماذا ستطلب.',
  gp_small => 'احصل عليه من', gp_big => 'Google Play', as_small => 'قريباً على', as_big => 'App Store', foot_app => 'حمّل التطبيق',
  dd_nav => 'عروض الأيام', dd_eyebrow => 'عروض الأيام', dd_title => 'عروض تتكرر كل أسبوع',
  dd_sub => 'بعض العلامات التجارية تقدّم عرضاً خاصاً في يوم ثابت من الأسبوع. هنا تعرف العرض وموعده.',
  dd_all => 'كل عروض الأيام', dd_every => 'كل', dd_today => 'اليوم!', dd_source => 'المصدر',
  dd_note => 'قد تتغير الأسعار، فتأكد من تطبيق العلامة التجارية قبل الطلب.',
  dd_page_title => 'عروض الأيام: عرض {brand} {day} وأكثر', dd_page_title0 => 'عروض الأيام في مصر',
  dd_page_desc => 'عروض مطاعم تتكرر في نفس اليوم كل أسبوع، مثل عرض {brand} {day}. اعرف عروض كل يوم ومصدر كل عرض.',
  dd_h1 => 'عروض الأيام', dd_lede => 'عروض تتكرر في نفس اليوم كل أسبوع. نضيف كل عرض من الصفحة الرسمية للعلامة التجارية ونضع رابط المصدر.',
  dd_day_h2 => 'عروض يوم {day}', dd_q => 'ما هو عرض {brand} {day}؟', dd_brand_h2 => 'عرض {brand} {day}',
  dd_know => 'تعرف عرضاً أسبوعياً غير موجود هنا؟', dd_know_p => 'ابعته لنا على فيسبوك أو إنستجرام وسنضيفه بعد التأكد من الصفحة الرسمية للعلامة التجارية.',
  dd_empty => 'لا توجد عروض أيام حالياً، تابعنا قريباً.',
  ro_all => 'كل عروض {name}', ro_save => 'وفّر <bdi>{p}%</bdi>', ro_was => 'بدل {was}', egp => 'جنيه', ro_from => 'تبدأ من {min} جنيه',
  ro_h1 => 'عروض {name}', ro_lede => '{count} تبدأ من {min} جنيه، ووفّر حتى {max}% من سعر المنيو.',
  ro_checked => 'الأسعار من المنيو الرسمي، تحقّق منها فريق Foodidu في {date}', ro_order => 'اطلب من {name}', ro_call => 'اتصل {phone}',
  ro_how => 'طريقة طلب عروض {name}', ro_s1 => 'افتح منيو {name}', ro_s1p => 'من الموقع، ادخل على قسم العروض.',
  ro_s2 => 'اختر العرض', ro_s2p => 'أضف العرض الذي تريده إلى السلة.', ro_s3 => 'اطلب أو اتصل', ro_s3p => 'أكمل الطلب أونلاين أو اتصل على {phone}.',
  ro_q1 => 'ما هي عروض {name}؟', ro_a1 => 'يعرض {name} حالياً {count} في المنيو: {list}.',
  ro_q2 => 'ما هو أرخص عرض في {name}؟', ro_a2 => '{offer} بـ {price} جنيه: {items}.',
  ro_q3 => 'كيف أطلب عروض {name}؟', ro_a3 => 'من قسم العروض في منيو {name} أونلاين، أو بالاتصال على {phone}.',
  ro_q4 => 'هل تتغير الأسعار؟', ro_a4 => 'هذه الأسعار من منيو {name} الرسمي بتاريخ {date} وقد تتغير، فراجع المنيو قبل الطلب.',
  ro_src => 'الأسعار من منيو {name} الرسمي وقد تتغير.', ro_valid => 'العروض سارية حتى {date}',
  ft_label => 'عرض مميز', ft_sponsored => 'إعلان', ft_until => 'حتى {date}',
  ft_rest_title => 'عروض {name}: وفّر حتى <bdi>{p}%</bdi>', ft_rest_text => '{n} من المنيو تبدأ من {min} جنيه', ft_rest_cta => 'شوف العروض',
  ft_code_title => 'كود خصم {name}', ft_code_cta => 'خد الكود',
  band_title => 'عندك مطعم أو براند أكل؟', band_text => 'اعرض كود الخصم الخاص بك أمام أشخاص على وشك الطلب. قدّم في دقيقتين وسيتواصل معك فريقنا.', band_btn => 'انضم لشركاء Foodidu',
  faq_eyebrow => 'أسئلة شائعة', faq_title => 'عندك سؤال؟',
  c_title => 'كل أكواد الخصم: مطاعم وبقالة وتسوق أونلاين',
  c_desc => 'تصفّح كل أكواد خصم Foodidu في قائمة واحدة: مطاعم مثل كنتاكي وبيتزا هت، وتطبيقات بقالة مثل رابيت وبريدفاست، ونون للتسوق أونلاين.',
  c_h1 => 'كل أكواد الخصم', c_lede => 'كل أكواد Foodidu في مكان واحد: {n} بين المطاعم وتطبيقات البقالة والتسوق أونلاين في مصر والخليج.',
  c_group_restaurants => 'أكواد خصم المطاعم', c_group_groceries => 'أكواد خصم البقالة والسوبر ماركت', c_group_shopping => 'أكواد خصم التسوق أونلاين',
  c_empty => 'لا توجد أكواد تطابق هذا الاختيار.', c_filters => 'تصفية الأكواد',
  b_h1 => 'كود خصم {name}', b_f_region => 'متاح في', b_f_where => 'استخدمه على', b_f_checked => 'تحقّق منه Foodidu', b_f_cost => 'على Foodidu', b_go => 'اذهب إلى {name}',
  b_how => 'طريقة استخدام كود {name}', b_st1 => 'انسخ الكود', b_st1p => 'اضغط على «انسخ الكود» لنسخ {code}.',
  b_st2 => 'افتح {where}', b_st2p => 'وأضف ما تريده إلى السلة كالمعتاد.',
  b_st3 => 'الصقه عند الدفع', b_st3p => 'الصق الكود في خانة كود الخصم أو القسيمة، وسيُطبَّق الخصم إذا كان طلبك مطابقاً للشروط.',
  b_about => 'عن {name}', b_faq => 'أسئلة عن كود {name}',
  b_q1 => 'ما هو كود خصم {name}؟', b_a1 => 'كود {name} على Foodidu هو {code}، ويمنحك: {offer}.',
  b_q2 => 'كيف أستخدم كود خصم {name}؟', b_a2 => 'انسخ الكود {code}، وافتح {where}، وأضف طلبك إلى السلة، ثم الصق الكود في خانة كود الخصم عند الدفع.',
  b_q3 => 'هل للكود شروط؟', b_q4 => 'لماذا لا يعمل كود {name}؟',
  b_a4 => 'تأكد أن طلبك يطابق الشروط (مثل أن يكون أول طلب أو بحد أدنى للقيمة) وأنك كتبت الكود تماماً كما هو. العروض تحددها {name} وقد تتغير أو تنتهي في أي وقت، وإذا لم ينجح الكود جرّب كوداً آخر على Foodidu.',
  b_note => 'العروض تحددها {name} وقد تتغير أو تنتهي دون إشعار. أسماء وشعارات العلامات التجارية مملوكة لأصحابها.',
  b_side_code => 'كود {name}', b_side_cats => 'تصفّح حسب الفئة', b_related => 'المزيد من أكواد {cat}', b_terms => 'الشروط',
  b_h1_multi => 'أكواد خصم {name}', b_side_codes => 'أكواد {name}', b_st1p_multi => 'اضغط «انسخ الكود» بجانب الكود الذي تريد استخدامه.',
  b_a1_multi => 'أكواد {name} على Foodidu: {list}.', checked_short => 'تم التحقق في {date}', h_fact_checked => 'تم التحقق {date}', h_fact_checked_n => '{n} كود اتحقق منه في {date}',
  cat_def_restaurants => 'المطاعم', cat_def_groceries => 'البقالة', cat_def_shopping => 'التسوق أونلاين',
  p_title => 'انضم لشركاء Foodidu: اعرض عروض مطعمك',
  p_desc => 'عندك مطعم أو كافيه أو براند أكل في مصر؟ قدّم الآن لعرض كود الخصم الخاص بك على Foodidu والوصول لأشخاص على وشك الطلب.',
  p_h1 => 'انضم لشركاء Foodidu',
  p_lede => 'عندك مطعم أو كافيه أو مطبخ سحابي أو براند أكل؟ اعرض كود الخصم الخاص بك على Foodidu، ووصّل عرضك لأشخاص يبحثون عن خصم قبل أن يطلبوا مباشرة.',
  p_cta => 'قدّم الآن', p_v_eyebrow => 'لماذا تنضم', p_v_title => 'اظهر أمام عملاء جائعين',
  p_v1 => 'عملاء جاهزون للطلب', p_v1p => 'يزور الناس Foodidu عندما يكونون على وشك الطلب ويبحثون عن سعر أفضل، فيظهر عرضك أمامهم في هذه اللحظة.',
  p_v2 => 'صفحة خاصة لعلامتك', p_v2p => 'صفحة مخصصة لكودك بالعربية والإنجليزية، مصمَّمة لتظهر عندما يبحث الناس عن كود خصم علامتك.',
  p_v3 => 'أنت تحدد العرض', p_v3p => 'اختر نسبة الخصم والشروط ومدة العرض، وأخبرنا عند أي تغيير لنحدّثه.',
  p_how_title => 'كيف تعمل الشراكة', p_s1 => 'قدّم', p_s1p => 'املأ النموذج القصير بالأسفل.', p_s2 => 'نتواصل معك', p_s2p => 'يراجع فريقنا طلبك ويتواصل معك.', p_s3 => 'انطلق', p_s3p => 'ينطلق كودك وصفحة علامتك على Foodidu.',
  p_form_title => 'قدّم طلب الشراكة', p_form_sub => 'الحقول المميزة بـ * مطلوبة.',
  f_business => 'اسم النشاط', f_contact => 'اسم المسؤول', f_contact_hint => 'حروف عربية أو إنجليزية فقط.', f_phone => 'رقم الهاتف', f_email => 'البريد الإلكتروني',
  f_location => 'موقع النشاط', f_location_ph => 'مثال: مدينة نصر، القاهرة', f_type => 'نوع النشاط', f_type_ph => 'اختر نوع النشاط',
  f_restaurant => 'مطعم', f_cafe => 'كافيه', f_cloud => 'مطبخ سحابي', f_truck => 'عربة طعام', f_bakery => 'مخبز', f_other => 'أخرى',
  f_desc => 'أخبرنا عن نشاطك', f_desc_ph => 'نوع الأكل والفروع والعرض الذي تفكر فيه', f_web => 'الموقع الإلكتروني أو صفحة السوشيال (اختياري)',
  f_submit => 'أرسل الطلب', f_privacy => 'نستخدم هذه البيانات لمراجعة طلبك فقط.',
  p_q1 => 'ما أنواع الأنشطة التي يمكنها التقديم؟', p_a1 => 'المطاعم والكافيهات والمطابخ السحابية وعربات الطعام والمخابز وأي نشاط طعام آخر.',
  p_q2 => 'هل أحتاج إلى موقع إلكتروني؟', p_a2 => 'لا. رقم الهاتف والموقع كافيان للتقديم، وأضف موقعك أو صفحة السوشيال إن وُجدت.',
  p_q3 => 'هل يمكنني تغيير العرض لاحقاً؟', p_a3 => 'نعم، أخبرنا عند تغيير عرضك وسنحدّث الكود والصفحة.',
  p_q4 => 'هل يمكن أن يظهر مطعمي أعلى الصفحة الرئيسية؟', p_a4 => 'نعم. مساحة «عرض مميز» أسفل واجهة الصفحة الرئيسية مباشرة تعرض شريكاً واحداً في كل مرة. اذكر ذلك في طلبك وسنرسل لك التفاصيل.',
  pr_seo => 'سياسة الخصوصية في Foodidu: كيف نستخدم بياناتك',
  pr_title => 'سياسة الخصوصية', pr_desc => 'تعرّف على كيفية جمع Foodidu لمعلوماتك واستخدامها وحمايتها، والخدمات التي نستخدمها، وخياراتك بشأن ملفات تعريف الارتباط وبياناتك.',
  te_seo => 'الشروط والأحكام لاستخدام موقع Foodidu',
  te_title => 'الشروط والأحكام', te_desc => 'الشروط التي تنطبق عند استخدامك Foodidu وأكواد الخصم، بما في ذلك توفّر الأكواد ودقتها ومسؤولياتك كمستخدم.',
  updated => 'آخر تحديث: {date}',
  q1 => 'ما هو Foodidu؟', a1 => 'Foodidu (فوديدو) موقع مجاني يجمع أكواد وكوبونات الخصم للمطاعم وتطبيقات البقالة والتسوق أونلاين في مصر والخليج، باللغتين العربية والإنجليزية.',
  q2 => 'هل Foodidu مجاني؟', a2 => 'نعم، لا تحتاج إلى حساب. انسخ أي كود واستخدمه مباشرة في تطبيق أو موقع العلامة التجارية.',
  q3 => 'كيف أستخدم كود الخصم؟', a3 => 'اضغط «انسخ» على الكود، وافتح تطبيق أو موقع العلامة التجارية، وأضف طلبك إلى السلة، ثم الصق الكود في خانة كود الخصم عند الدفع.',
  q4 => 'لماذا لم يعمل الكود؟', a4 => 'معظم الأكواد لها شروط مثل أول طلب فقط أو حد أدنى لقيمة الطلب، ويمكن للعلامات التجارية تغيير العروض أو إنهاؤها في أي وقت. راجع الشروط في صفحة الكود وتأكد أنك كتبته كما هو تماماً.',
  q5 => 'كيف يظهر مطعمي على Foodidu؟', a5 => 'املأ <a href="{partners}">نموذج طلب الشراكة</a> وسيتواصل معك فريقنا.',
 },
);
my @MONTHS_EN = qw(January February March April May June July August September October November December);
my @MONTHS_AR = qw(يناير فبراير مارس أبريل مايو يونيو يوليو أغسطس سبتمبر أكتوبر نوفمبر ديسمبر);

sub esc { my $s = shift // ''; $s =~ s/&/&amp;/g; $s =~ s/</&lt;/g; $s =~ s/>/&gt;/g; $s =~ s/"/&quot;/g; $s }
sub T {                                 # T(lang, key, var => value ...) ; values are inserted raw
  my ($l, $k, %v) = @_;
  my $s = $S{$l}{$k} // die "missing string $l.$k";
  $s =~ s/\{(\w+)\}/exists $v{$1} ? $v{$1} : "{$1}"/ge;
  $s;
}
sub Te { my ($l, $k, %v) = @_; T($l, $k, map { ($_ => esc($v{$_})) } keys %v) }   # escaped values
sub strip_tags { my $s = shift; $s =~ s/<[^>]+>//g; $s =~ s/&amp;/&/g; $s }
sub path_for { my ($l, $p) = @_; $l eq 'ar' ? ($p eq '/' ? '/ar/' : "/ar$p") : $p }
sub absu { $SITE . $_[0] }
sub nbrands { my ($l, $n) = @_; return $l eq 'en' ? "$n brands" : ($n <= 10 ? "$n علامات تجارية" : "$n علامة تجارية") }
sub ncodes  { my ($l, $n) = @_; return $n == 1 ? '1 code' : "$n codes" if $l eq 'en'; return $n == 1 ? 'كود واحد' : $n == 2 ? 'كودان' : $n <= 10 ? "$n أكواد" : "$n كوداً" }
sub fmt_date { my ($l, $ymd) = @_; my ($y, $m, $d) = split /-/, $ymd; return $l eq 'en' ? ($d + 0) . " $MONTHS_EN[$m-1] $y" : ($d + 0) . " $MONTHS_AR[$m-1] $y" }
sub month_year { my ($l, $ymd) = @_; my ($y, $m) = split /-/, $ymd; return $l eq 'en' ? substr($MONTHS_EN[$m-1], 0, 3) . " $y" : "$MONTHS_AR[$m-1] $y" }
sub fresh { my $ymd = shift or return 0; my ($y, $m, $d) = split /-/, $ymd; my $t = eval { timegm(0, 0, 12, $d, $m - 1, $y) } or return 0; return ($NOW - $t) / 86400 <= 45 && $t <= $NOW + 86400 }

# ------------------------------------------------------------------ icons
my %ICON = (
  copy     => '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  check    => '<path d="M20 6 9 17l-5-5"/>',
  arrow    => '<path d="M5 12h14M13 5l7 7-7 7"/>',
  external => '<path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
  search   => '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  menu     => '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close    => '<path d="M6 6l12 12M18 6 6 18"/>',
  globe    => '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  fork     => '<path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10M17 21V3c-2.2 1.2-3.5 3.8-3.5 7v3H17"/>',
  basket   => '<path d="M4 10h16l-1.6 8.2A2 2 0 0 1 16.4 20H7.6a2 2 0 0 1-2-1.8L4 10Z"/><path d="m8 10 3-6M16 10l-3-6M9.5 14v2.5M14.5 14v2.5"/>',
  bag      => '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  layers   => '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  list     => '<path d="M10 6h10M10 12h10M10 18h10"/><path d="m3.5 6 1.5 1.5L7.5 5M3.5 12l1.5 1.5 2.5-2.5M3.5 18l1.5 1.5 2.5-2.5"/>',
  lang     => '<path d="M4 5h9M8.5 3v2M11 5c-.8 4-3.5 7-7 8.5M6 9c1.2 2 3 3.6 5 4.5"/><path d="m13 21 4-9 4 9M14.5 18h5"/>',
  gift     => '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M12 8H8.5a2.5 2.5 0 1 1 0-5C11 3 12 8 12 8Zm0 0h3.5a2.5 2.5 0 1 0 0-5C13 3 12 8 12 8Z"/>',
  target   => '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  page     => '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  sliders  => '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  shield   => '<path d="M12 3 5 6v6c0 4.4 3 8 7 9 4-1 7-4.6 7-9V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
  info     => '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  plus     => '<path d="M12 5v14M5 12h14"/>',
  pin      => '<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
  tag      => '<path d="M3 12V4h8l10 10-8 8L3 12Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  store    => '<path d="M4 9h16l-1-5H5L4 9Z"/><path d="M5 9v11h14V9M9 20v-6h6v6"/>',
  phone    => '<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M11 18.5h2"/>',
  play     => '<path fill="currentColor" stroke="none" d="M5 3.8v16.4a1 1 0 0 0 1.5.9l14-8.2a1 1 0 0 0 0-1.8l-14-8.2A1 1 0 0 0 5 3.8Z"/>',
  clock    => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  menubook => '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z"/><path d="M4 19a2 2 0 0 1 2-2h13v4H6a2 2 0 0 1-2-2ZM9 7h6M9 11h6"/>',
  bolt     => '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  calendar => '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="m9.5 15 2 2 3.5-3.5"/>',
  pizza    => '<path d="M12 3 4.5 19.5c4.8 2 10.2 2 15 0Z"/><path d="M6.8 14.5c3.4 1.3 7 1.3 10.4 0"/><circle cx="12" cy="10.5" r="1.2"/><circle cx="10" cy="15.6" r=".9"/><circle cx="14.2" cy="15.6" r=".9"/>',
  facebook => '<path fill="currentColor" stroke="none" d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v7h4v-7h3l.5-4h-3.5V9c0-.6.4-1 1-1Z"/>',
  instagram=> '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>',
  tiktok   => '<path fill="currentColor" stroke="none" d="M16.5 3c.3 2.3 1.8 3.9 4 4.1v3.3c-1.5 0-2.9-.4-4-1.2v6.3A5.5 5.5 0 1 1 11 10v3.4a2.2 2.2 0 1 0 2 2.2V3h3.5Z"/>',
  linkedin => '<path fill="currentColor" stroke="none" d="M4 9h4v12H4zM6 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm4 6h3.8v1.7c.6-1 1.9-2 3.9-2 4 0 4.3 2.6 4.3 6V21h-4v-5.5c0-1.5 0-3.3-2-3.3s-2.3 1.5-2.3 3.2V21H10z"/>',
);
sub icon { my ($n, $cls) = @_; $cls = $cls ? " $cls" : ''; qq{<svg class="icon$cls" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">$ICON{$n}</svg>} }

# ------------------------------------------------------------------ static assets (fingerprinted css/js)
remove_tree($OUT) if -d $OUT;
make_path($OUT);
my %ASSET;
File::Find::find({ no_chdir => 1, wanted => sub {
  return unless -f $_;
  my $rel = substr($_, length("$ROOT/static/"));
  $rel =~ s{\\}{/}g;
  my $bytes = slurp($_, 1);
  my $dest = $rel;
  if ($rel =~ m{^((?:css|js)/[a-z-]+)\.(css|js)$}) { $dest = "$1." . substr(md5_hex($bytes), 0, 10) . ".$2"; }
  $ASSET{"/$rel"} = "/$dest";
  spit("$OUT/$dest", $bytes, 1);
}}, "$ROOT/static");
sub asset { $ASSET{$_[0]} // $_[0] }
sub logo_src { "/img/brands/$_[0]{logo}" }

# ------------------------------------------------------------------ components
sub code_btn {
  my ($b, $l, $lg) = @_;
  my $code = esc($b->{code});
  qq{<button type="button" class="code-btn} . ($lg ? ' lg' : '') . qq{" data-code="$code" data-brand="$b->{key}" aria-label="} . Te($l, 'copy_aria', code => $b->{code}) . qq{">}
  . qq{<span class="code" dir="ltr">$code</span>}
  . qq{<span class="act">} . icon('copy', 'i-copy') . icon('check', 'i-check') . qq{<span class="act-label">} . T($l, 'copy') . qq{</span></span></button>};
}
sub deal_html {
  my ($b, $l) = @_;
  my ($big, $small) = map { esc($_) } @{ $b->{badge}{$l} };
  my $cls = length($b->{badge}{$l}[0]) > 6 ? "deal long" : "deal";   # "100 جنيه" needs a smaller size on narrow cards
  return $l eq 'ar' ? qq{<p class="$cls"><span>$small</span><b dir="auto">$big</b></p>} : qq{<p class="$cls"><b dir="auto">$big</b><span>$small</span></p>};
}
sub brand_url { my ($b, $l) = @_; path_for($l, "/$b->{slug}/") }
# Home "Every brand on Foodidu": a small coupon-style card per brand linking to its page.
sub brand_card {
  my ($b, $l) = @_;
  my $n = scalar(my @o = offers_of($b));
  my ($big, $small) = map { esc($_) } @{ $b->{badge}{$l} };
  my $long = length($b->{badge}{$l}[0]) > 6 ? ' long' : '';
  my $deal = $l eq 'ar' ? qq{<span>$small</span><b dir="auto">$big</b>} : qq{<b dir="auto">$big</b><span>$small</span>};
  my $meta = join ' · ', esc($CATN{ $b->{category} }{$l}), region_label($b, $l), ($n > 1 ? ncodes($l, $n) : ());
  my $flag = $b->{exclusive} ? '<span class="bcard-flag">' . icon('gift') . T($l, 'exclusive') . '</span>' : '';
  return '<li><a class="bcard" href="' . brand_url($b, $l) . '"><span class="bcard-top"><span class="logo-tile">' . logo_img($b, $l, 56) . "</span>$flag</span>"
    . '<span class="bcard-name">' . esc($b->{name}{$l}) . qq{</span><span class="bcard-meta">$meta</span>}
    . '<span class="bcard-offer">' . esc(offers_text($b, $l)) . '</span>'
    . qq{<span class="bcard-foot"><span class="bcard-deal$long">$deal</span>} . icon('arrow', 'flip go') . '</span></a></li>';
}
sub regions { my $r = shift; ref $r eq 'ARRAY' ? @$r : ($r // ()) }   # "eg", "gcc", "all" or a list
sub region_label {
  my ($x, $l) = @_;
  return esc($x->{regionLabel}{$l}) if $x->{regionLabel};
  join($l eq 'ar' ? ' و' : ' & ', map { $_ eq 'all' ? T($l, 'all_regions') : T($l, $_) } regions($x->{region}));
}
sub meta_line { my ($b, $l) = @_; esc($CATN{$b->{category}}{$l}) . ' · ' . region_label($b, $l) }
sub logo_img  { my ($b, $l, $size, $eager) = @_; qq{<img src="} . logo_src($b) . qq{" alt="} . Te($l, 'logo_alt', name => $b->{name}{$l}) . qq{" width="$size" height="$size"} . ($eager ? ' fetchpriority="high"' : ' loading="lazy"') . qq{ decoding="async">} }

sub ticket {
  my ($b, $l, %o) = @_;
  my $url = brand_url($b, $l);
  my $name = esc($b->{name}{$l});
  my $tag = $o{mini} ? 'p' : ($o{h} // 'h3');
  my $flag = $b->{exclusive} ? '<span class="flag">' . T($l, 'exclusive') . '</span>' : '';
  my $more = $o{mini} ? '' : qq{<a class="ticket-more" href="$url" aria-label="} . T($l, 'details') . qq{: $name">} . '<span class="more-label">' . T($l, 'details') . '</span> ' . icon('arrow', 'flip') . '</a>';
  qq{<article class="ticket"><div class="ticket-main"><div class="ticket-top"><span class="logo-tile">} . logo_img($b, $l, 52, $o{eager}) . qq{</span>}
  . qq{<div><$tag class="ticket-brand"><a href="$url">$name</a></$tag><span class="ticket-meta">} . meta_line($b, $l) . qq{</span></div>$flag</div>}
  . deal_html($b, $l) . qq{<p class="ticket-offer">} . esc($b->{offer}{$l}) . '</p>'
  . ($o{mini} || !fresh($b->{lastVerified}) ? '' : '<p class="ticket-check">' . icon('shield') . T($l, 'checked_short', date => month_year($l, $b->{lastVerified})) . '</p>')
  . '</div>'
  . qq{<div class="ticket-stub">} . code_btn($b, $l) . qq{$more</div></article>};
}
sub ticket_li {
  my ($b, $l, %o) = @_;
  my $search = lc join ' ', $b->{name}{en}, $b->{name}{ar}, $b->{code}, $b->{key};
  qq{<li data-cat="$b->{category}" data-region="@{[ join ' ', regions($b->{region}) ]}" data-search="} . esc($search) . qq{">} . ticket($b, $l, %o) . '</li>';
}
sub faq_html {
  my (@qa) = @_;
  '<div class="faq">' . join('', map { qq{<details><summary>$_->[0]<span class="pm">} . icon('plus') . qq{</span></summary><div class="ans"><p>$_->[1]</p></div></details>} } @qa) . '</div>';
}
sub faq_ld { my (@qa) = @_; { '@type' => 'FAQPage', mainEntity => [ map { { '@type' => 'Question', name => strip_tags($_->[0]), acceptedAnswer => { '@type' => 'Answer', text => strip_tags($_->[1]) } } } @qa ] } }
sub search_form {
  my ($l) = @_;
  qq{<form class="search" role="search" action="} . path_for($l, '/promo-codes/') . qq{" autocomplete="off">}
  . qq{<label class="sr-only" for="q">} . T($l, 'search_label') . '</label>'
  . qq{<div class="search-box">} . icon('search') . qq{<input id="q" name="q" type="search" placeholder="} . T($l, 'search_ph') . qq{" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="search-results" enterkeyhint="search">}
  . qq{<button class="btn btn-ink" type="submit">} . T($l, 'search_btn') . '</button></div>'
  . qq{<ul class="search-results" id="search-results" role="listbox" hidden></ul></form>};
}
sub band {
  my ($l) = @_;
  qq{<section class="wrap section-tight"><div class="band"><div><h2>} . T($l, 'band_title') . '</h2><p>' . T($l, 'band_text') . qq{</p><a class="btn btn-sun" href="} . path_for($l, '/partners/') . '">' . T($l, 'band_btn') . ' ' . icon('arrow', 'flip') . qq{</a></div><img class="face" src="$LOGO" alt="" width="200" height="79" loading="lazy"></div></section>};
}
sub store_buttons {
  my ($l, $cls) = @_;
  $cls = $cls ? " $cls" : '';
  qq{<div class="stores$cls"><a class="store" href="$PLAY_URL" rel="noopener" target="_blank" data-track="app_download_click" data-store="google_play">} . icon('play')
  . '<span><small>' . T($l, 'gp_small') . '</small><b>' . T($l, 'gp_big') . '</b></span></a>'
  . '<span class="store soon" aria-disabled="true">' . icon('phone') . '<span><small>' . T($l, 'as_small') . '</small><b>' . T($l, 'as_big') . '</b></span></span></div>';
}
sub app_section {
  my ($l) = @_;
  my $feats = join '', map { my ($ic, $n) = @$_; '<li><span class="ic">' . icon($ic) . '</span><div><h3>' . T($l, "app_f$n") . '</h3><p>' . T($l, "app_f${n}p") . '</p></div></li>' }
    (['pin', 1], ['clock', 2], ['bolt', 3], ['menubook', 4]);
  qq{<section class="wrap section-tight" id="app" aria-labelledby="app-title"><div class="app-band"><div class="app-copy">}
  . qq{<img class="app-logo" src="$LOGO" alt="Foodidu" width="152" height="60" loading="lazy">}
  . '<p class="eyebrow">' . T($l, 'app_eyebrow') . qq{</p><h2 class="h2" id="app-title">} . T($l, 'app_title') . '</h2><p class="app-sub">' . T($l, 'app_sub') . '</p>'
  . store_buttons($l) . qq{</div><ul class="app-feats">$feats</ul></div></section>};
}
sub crumbs_html {
  my ($l, $crumbs) = @_;
  my @li;
  for my $i (0 .. $#$crumbs) {
    my ($n, $p) = @{ $crumbs->[$i] };
    push @li, $i == $#$crumbs ? '<li><span aria-current="page">' . esc($n) . '</span></li>' : qq{<li><a href="$p">} . esc($n) . '</a></li>';
  }
  qq{<nav class="crumbs" aria-label="Breadcrumb"><ol>} . join('', @li) . '</ol></nav>';
}

# ------------------------------------------------------------------ layout
my @PAGES;   # for sitemap: { key, lastmod }
sub layout {
  my (%a) = @_;
  my $l = $a{lang}; my $key = $a{key};
  my $other = $l eq 'en' ? 'ar' : 'en';
  my $url = absu(path_for($l, $key));
  my $title = $a{title};
  my $og = absu($a{og} // "/img/og/home-$l.png");
  my @g = (
    { '@type' => 'Organization', '@id' => "$SITE/#org", name => 'Foodidu', alternateName => 'فوديدو', url => "$SITE/",
      logo => { '@type' => 'ImageObject', url => "$SITE/img/foodidu-logo-512.png", width => 512, height => 512 },
      sameAs => [ map { $_->[2] } @SOCIAL ] },
    { '@type' => 'WebSite', '@id' => "$SITE/#website", url => "$SITE/", name => 'Foodidu', alternateName => 'فوديدو', inLanguage => ['en', 'ar'], publisher => { '@id' => "$SITE/#org" } },
    { '@type' => ($a{pagetype} // 'WebPage'), '@id' => "$url#webpage", url => $url, name => $title, description => $a{desc}, inLanguage => $l,
      isPartOf => { '@id' => "$SITE/#website" }, dateModified => ($a{lastmod} // $DATA_DATE), primaryImageOfPage => { '@type' => 'ImageObject', url => $og },
      ($a{crumbs} ? (breadcrumb => { '@id' => "$url#breadcrumb" }) : ()), ($a{about} ? (about => $a{about}) : ()) },
  );
  if ($a{crumbs}) {
    my $i = 0;
    push @g, { '@type' => 'BreadcrumbList', '@id' => "$url#breadcrumb",
      itemListElement => [ map { { '@type' => 'ListItem', position => ++$i, name => $_->[0], item => absu($_->[1]) } } @{ $a{crumbs} } ] };
  }
  push @g, @{ $a{ld} // [] };
  my $ld = JSON::PP->new->canonical->encode({ '@context' => 'https://schema.org', '@graph' => \@g });
  $ld =~ s{</}{<\\/}g;

  my %fd = (t => { map { ($_ => T($l, $_)) } qw(copy copied copiedToast copyFail noResults sending formOk formErr) }, %{ $a{fd} // {} });
  my $fd = JSON::PP->new->canonical->encode(\%fd); $fd =~ s{</}{<\\/}g;

  my $home = path_for($l, '/');
  my $codes = path_for($l, '/promo-codes/');
  my @nav = (
    [T($l, 'nav_codes'), $codes, 'codes', 'tag'], (@DDEALS ? [T($l, 'dd_nav'), path_for($l, '/day-deals/'), 'daydeals', 'calendar'] : ()),
    [T($l, 'nav_rest'), "$codes#restaurants", '', 'fork'], [T($l, 'nav_groc'), "$codes#groceries", '', 'basket'],
    [T($l, 'nav_shop'), "$codes#shopping", '', 'bag'], [T($l, 'nav_partner'), path_for($l, '/partners/'), 'partners', 'store'],
  );
  my $nav = join '', map { qq{<a href="$_->[1]"} . ($_->[2] && ($a{nav} // '') eq $_->[2] ? ' aria-current="page"' : '') . '><span class="nav-ic">' . icon($_->[3]) . "</span><span>$_->[0]</span>" . icon('arrow', 'nav-go flip') . '</a>' } @nav;
  my $other_label = $other eq 'ar' ? 'العربية' : 'English';
  $nav .= '<div class="nav-extra"><p class="nav-label">' . T($l, 'menu_more') . '</p>'
    . ($a{nolang} ? '' : qq{<a class="nav-lang" href="} . path_for($other, $key) . qq{" hreflang="$other" lang="$other">} . icon('globe') . "<span>$other_label</span></a>")
    . store_buttons($l, 'stores-menu') . '</div>';
  my $alt_links = $a{noindex} ? '' : join("\n", (map { qq{<link rel="alternate" hreflang="$_" href="} . absu(path_for($_, $key)) . '">' } @LANGS), qq{<link rel="alternate" hreflang="x-default" href="} . absu(path_for('en', $key)) . '">');
  my $lang_link = $a{nolang} ? '' : qq{<a class="lang" href="} . path_for($other, $key) . qq{" hreflang="$other" lang="$other" aria-label="$other_label">} . icon('globe') . qq{<span class="lang-long">$other_label</span></a>};
  my $robots = $a{noindex} ? 'noindex,follow' : 'index,follow,max-image-preview:large,max-snippet:-1';
  my $locale = $l eq 'ar' ? 'ar_EG' : 'en_US';
  my $olocale = $l eq 'ar' ? 'en_US' : 'ar_EG';
  my $css = asset('/css/site.css'); my $js = asset('/js/site.js');
  my $etitle = esc($title); my $edesc = esc($a{desc});

  my $foot_codes = join '', map { qq{<li><a href="} . brand_url($_, $l) . '">' . Te($l, 'foot_code_link', name => $_->{name}{$l}) . '</a></li>' } @BRANDS;
  my $social = join '', map { qq{<a href="$_->[2]" rel="noopener" target="_blank" aria-label="Foodidu on $_->[1]">} . icon($_->[0]) . '</a>' } @SOCIAL;

  my $html = <<"HTML";
<!doctype html>
<html lang="$l" dir="@{[ $l eq 'ar' ? 'rtl' : 'ltr' ]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>$etitle</title>
<meta name="description" content="$edesc">
<meta name="robots" content="$robots">
@{[ $a{noindex} ? '' : qq{<link rel="canonical" href="$url">} ]}
$alt_links
<meta name="theme-color" content="#FFD15C">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Foodidu">
<meta property="og:title" content="$etitle">
<meta property="og:description" content="$edesc">
<meta property="og:url" content="$url">
<meta property="og:image" content="$og">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="$etitle">
<meta property="og:locale" content="$locale">
<meta property="og:locale:alternate" content="$olocale">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="\@foodidu_official">
<meta name="twitter:title" content="$etitle">
<meta name="twitter:description" content="$edesc">
<meta name="twitter:image" content="$og">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/img/icon-192.png" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lalezar&amp;family=Readex+Pro:wght\@300..700&amp;display=swap">
<link rel="stylesheet" href="$css">
<script type="application/ld+json">$ld</script>
<script src="$js" defer></script>
</head>
<body>
<a class="skip" href="#main">@{[ T($l, 'skip') ]}</a>
<header class="site-header is-home">
<div class="wrap header-in">
<a class="brand" href="$home" aria-label="@{[ T($l, 'home_logo') ]}"><img src="$LOGO" width="116" height="46" alt="Foodidu"></a>
<nav class="nav" id="site-nav" aria-label="@{[ T($l, 'mainnav') ]}">$nav</nav>
<div class="nav-backdrop" data-nav-close hidden></div>
$lang_link
<button class="menu-btn" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="@{[ T($l, 'menu') ]}">@{[ icon('menu', 'i-menu') . icon('close', 'i-close') ]}</button>
</div>
</header>
<main id="main">
$a{body}
</main>
<footer class="site-footer">
<div class="wrap">
<div class="foot-grid">
<div class="foot-brand"><a class="brand" href="$home" aria-label="@{[ T($l, 'home_logo') ]}"><img src="$LOGO" width="140" height="55" alt="Foodidu" loading="lazy"></a><p>@{[ T($l, 'foot_blurb') ]}</p><div class="social">$social</div><h2 class="foot-app">@{[ T($l, 'foot_app') ]}</h2>@{[ store_buttons($l, 'stores-foot') ]}</div>
<nav aria-label="@{[ T($l, 'foot_codes') ]}"><h2>@{[ T($l, 'foot_codes') ]}</h2><ul class="foot-links cols">$foot_codes</ul></nav>
<nav aria-label="Foodidu"><h2>Foodidu</h2><ul class="foot-links">
<li><a href="$codes">@{[ T($l, 'foot_all') ]}</a></li>
@{[ @DDEALS ? '<li><a href="' . path_for($l, '/day-deals/') . '">' . T($l, 'dd_nav') . '</a></li>' : '' ]}
@{[ join '', map { '<li><a href="' . rest_url($_, $l) . '">' . Te($l, 'ro_h1', name => $_->{name}{$l}) . '</a></li>' } @RESTS ]}
<li><a href="@{[ path_for($l, '/partners/') ]}">@{[ T($l, 'nav_partner') ]}</a></li>
<li><a href="@{[ path_for($l, '/privacy-policy/') ]}">@{[ T($l, 'privacy') ]}</a></li>
<li><a href="@{[ path_for($l, '/terms-and-conditions/') ]}">@{[ T($l, 'terms') ]}</a></li>
<li><button type="button" data-cookie-settings>@{[ T($l, 'cookie_settings') ]}</button></li>
</ul></nav>
</div>
<div class="foot-bottom"><span>© $YEAR Foodidu. @{[ T($l, 'made') ]}</span><span>@{[ T($l, 'disclaimer') ]}</span></div>
</div>
</footer>
<div class="toast" id="toast" role="status" aria-live="polite">@{[ icon('check') ]}<span></span></div>
<div class="cookie" id="cookie" role="region" aria-label="@{[ T($l, 'cookies') ]}" hidden>
<p>@{[ T($l, 'cookie_text') ]} <a href="@{[ path_for($l, '/privacy-policy/') ]}">@{[ T($l, 'privacy') ]}</a></p>
<div class="row"><button class="btn btn-ink" type="button" data-accept>@{[ T($l, 'accept') ]}</button><button class="btn btn-line" type="button" data-decline>@{[ T($l, 'decline') ]}</button></div>
</div>
<script id="fd-data" type="application/json">$fd</script>
</body>
</html>
HTML
  $html =~ s/\n{2,}/\n/g;
  my $file = $a{file} // "$OUT" . path_for($l, $key) . 'index.html';
  spit($file, $html);
  push @PAGES, { key => $key, lang => $l, lastmod => ($a{lastmod} // $DATA_DATE) } unless $a{noindex};
}

# A brand's codes: the main one first, then any "moreCodes" (each rendered as its own ticket).
sub offers_of {
  my $b = shift;
  return ($b, map { +{ %$b, code => $_->{code}, badge => $_->{badge}, offer => $_->{offer}, terms => $_->{terms}, exclusive => ($_->{exclusive} // 0), extra => 1 } } @{ $b->{moreCodes} // [] });
}
sub offers_text { my ($b, $l) = @_; join ' · ', map { $_->{offer}{$l} } offers_of($b) }
sub search_index {
  my ($l) = @_;
  [ (map { my $b = $_; { n => $b->{name}{$l}, s => join(' ', $b->{name}{en}, $b->{name}{ar}, map { $_->{code} } offers_of($b)), u => brand_url($b, $l), l => logo_src($b), o => offers_text($b, $l) } } @BRANDS),
    (map { my $r = $_; { n => $r->{name}{$l}, s => join(' ', $r->{name}{en}, $r->{name}{ar}, $r->{key}), u => rest_url($r, $l), l => "/img/brands/$r->{logo}", o => noffers($l, scalar @{ $r->{offers} }) . ' · ' . T($l, 'ro_from', min => fmt_n(rest_min($r))) } } @RESTS) ];
}
my %BYKEY = map { ($_->{key} => $_) } @BRANDS;
sub count_cat { my $c = shift; my @o = map { offers_of($_) } grep { $_->{category} eq $c } @BRANDS; scalar @o }
my @ALL_OFFERS = map { offers_of($_) } @BRANDS;
my $NCODES = scalar @ALL_OFFERS;
my @VERIFIED = sort grep { $_ } map { $_->{lastVerified} } @BRANDS;
# Brands without lastVerified were never checked by us: they never count as checked anywhere on the site.
my @CHECKED_BRANDS = grep { $_->{lastVerified} } @BRANDS;
my $ALL_FRESH = !grep { !fresh($_->{lastVerified}) } @CHECKED_BRANDS;
my $NCHECKED = scalar map { offers_of($_) } @CHECKED_BRANDS;

# ---------- day deals (offers that repeat on a fixed weekday)
sub dd_brand { my $d = shift; $d->{brand} ? $BYKEY{ $d->{brand} } : undef }
sub dd_rest  { my $d = shift; return undef unless $d->{brand}; (grep { $_->{key} eq $d->{brand} } @RESTS)[0] }
sub dd_name  { my ($d, $l) = @_; my $x = dd_brand($d) // dd_rest($d) // $d; $x->{name}{$l} }
sub dd_range {   # 3+ consecutive weekdays, e.g. Sunday to Wednesday
  my @ix = map { $DAYI{$_} } @{ $_[0]{days} };
  return 0 if @ix < 3;
  for (1 .. $#ix) { return 0 unless $ix[$_] == $ix[$_ - 1] + 1 }
  1;
}
sub dd_days {    # plain: "Tuesday" / "Sunday to Wednesday" (card meta line)
  my ($d, $l) = @_; my @dd = @{ $d->{days} };
  return $l eq 'ar' ? "من $DAYN{ar}{$dd[0]} إلى $DAYN{ar}{$dd[-1]}" : "$DAYN{en}{$dd[0]} to $DAYN{en}{$dd[-1]}" if dd_range($d);
  join($l eq 'ar' ? ' و' : ' & ', map { $DAYN{$l}{$_} } @dd);
}
sub dd_when {    # in a sentence: "Tuesday" / "Sunday-to-Wednesday"; Arabic adds "يوم" for one day
  my ($d, $l) = @_; my @dd = @{ $d->{days} };
  if (dd_range($d)) { return $l eq 'ar' ? "من $DAYN{ar}{$dd[0]} إلى $DAYN{ar}{$dd[-1]}" : "$DAYN{en}{$dd[0]}-to-$DAYN{en}{$dd[-1]}" }
  return $l eq 'ar' ? "يوم $DAYN{ar}{$dd[0]}" : $DAYN{en}{$dd[0]} if @dd == 1;
  $l eq 'ar' ? 'أيام ' . join(' و', map { $DAYN{ar}{$_} } @dd) : join(' & ', map { $DAYN{en}{$_} } @dd);
}
sub dday_card {
  my ($d, $l) = @_;
  my $b = dd_brand($d);
  my $r = $b ? undef : dd_rest($d);
  my $name = dd_name($d, $l);
  my $href = $b ? brand_url($b, $l) : $r ? rest_url($r, $l) : ($d->{url} // '');
  my $logo = $b ? logo_img($b, $l, 44) : $r ? rest_logo($r, $l, 44)
    : $d->{logo} ? qq{<img src="/img/brands/$d->{logo}" alt="} . Te($l, 'logo_alt', name => $name) . qq{" width="44" height="44" loading="lazy" decoding="async">}
    : icon($d->{icon} // 'fork');
  my $robj = $b // $r // $d;
  my $nameh = $href ? qq{<a href="$href">} . esc($name) . '</a>' : esc($name);
  my @days = @{ $d->{days} };
  my $cal = @days == 1 ? $DAYC{$l}{ $days[0] }
    : dd_range($d) ? "$DSHORT{$l}{$days[0]}–$DSHORT{$l}{$days[-1]}"
    : join(' · ', map { $DSHORT{$l}{$_} } @days);
  qq{<article class="dday" data-days="@days">}
  . '<div class="dday-cal' . (@days > 1 ? ' multi' : '') . '" aria-hidden="true"><span>' . T($l, 'dd_every') . "</span><b>$cal</b></div>"
  . '<div class="dday-body"><div class="dday-brand"><span class="logo-tile">' . $logo . '</span><div>'
  . qq{<h3 class="dday-name">$nameh</h3><span class="ticket-meta">} . esc(dd_days($d, $l)) . ($robj->{region} ? ' · ' . region_label($robj, $l) : '') . '</span></div>'
  . '<span class="today-tag" hidden>' . T($l, 'dd_today') . '</span></div>'
  . '<p class="dday-title">' . esc($d->{title}{$l}) . '</p>'
  . '<p class="dday-text">' . esc($d->{details}{$l}) . '</p>'
  . '<p class="dday-src">' . icon('external') . '<span>' . T($l, 'dd_source') . ': <a href="' . esc($d->{source}) . '" rel="nofollow noopener" target="_blank" data-track="day_deal_source_click" data-deal="' . esc($d->{id}) . '">' . esc($d->{sourceLabel}{$l}) . '</a></span></p>'
  . '</div></article>';
}
sub by_weekday { sort { $DAYI{ $a->{days}[0] } <=> $DAYI{ $b->{days}[0] } } @_ }   # Saturday first; JS moves today's deal to the top
sub dday_list { my ($l, @ds) = @_; '<ul class="dday-list">' . join('', map { '<li>' . dday_card($_, $l) . '</li>' } by_weekday(@ds)) . '</ul>' }
# ---------- restaurant menu offers (no code; price vs. menu price)
sub noffers  { my ($l, $n) = @_; return $n == 1 ? '1 offer' : "$n offers" if $l eq 'en'; return $n == 1 ? 'عرض واحد' : $n == 2 ? 'عرضان' : $n <= 10 ? "$n عروض" : "$n عرضاً" }
sub fmt_n    { my $n = shift; 1 while $n =~ s/^(\d+)(\d{3})/$1,$2/; $n }
sub save_pct { my $o = shift; $o->{was} ? int((1 - $o->{price} / $o->{was}) * 100 + 0.5) : 0 }
sub rest_url { my ($r, $l) = @_; path_for($l, "/$r->{slug}/") }
sub rest_logo { my ($r, $l, $size) = @_; qq{<img src="/img/brands/$r->{logo}" alt="} . Te($l, 'logo_alt', name => $r->{name}{$l}) . qq{" width="$size" height="$size" loading="lazy" decoding="async">} }
sub rest_min { my $r = shift; (sort { $a <=> $b } map { $_->{price} } @{ $r->{offers} })[0] }
sub rest_max_save { my $r = shift; (sort { $b <=> $a } map { save_pct($_) } @{ $r->{offers} })[0] }
sub oname { my ($o, $l) = @_; ref $o->{name} ? $o->{name}{$l} : $o->{name} }   # offer name: plain string or {en, ar}
sub moffer_card {
  my ($o, $l, $h) = @_;
  $h //= 'h3';
  my $egp = T($l, 'egp');
  qq{<article class="moffer"><span class="moffer-save">} . T($l, 'ro_save', p => save_pct($o)) . '</span>'
  . qq{<$h class="moffer-name"><bdi>} . esc(oname($o, $l)) . "</bdi></$h>"
  . '<p class="moffer-items">' . esc($o->{items}{$l}) . '</p>'
  . '<p class="moffer-price"><b>' . fmt_n($o->{price}) . "</b> <span>$egp</span> <span class=\"moffer-was\">" . T($l, 'ro_was', was => '<s>' . fmt_n($o->{was}) . " $egp</s>") . '</span></p></article>';
}
# Featured-partner banner under the home hero (data/featured.json). Gone after "until"; site.js also hides it
# on that date when the site was not rebuilt.
sub featured_html {
  my $l = shift;
  my $key = $FEAT->{partner} // '';
  return '' unless $FEAT->{active} && $key && !($FEAT->{until} && $FEAT->{until} lt $TODAY);
  my ($r) = grep { $_->{key} eq $key } @RESTS;
  my $b = $BYKEY{$key};
  die "data/featured.json: unknown partner '$key'\n" unless $r || $b;
  my $name = ($r // $b)->{name}{$l};
  my ($title, $text, $cta, $url, $logo) = $r
    ? (Te($l, 'ft_rest_title', name => $name, p => rest_max_save($r)), T($l, 'ft_rest_text', n => noffers($l, scalar @{ $r->{offers} }), min => fmt_n(rest_min($r))),
       T($l, 'ft_rest_cta'), rest_url($r, $l), rest_logo($r, $l, 64))
    : (Te($l, 'ft_code_title', name => $name), esc(offers_text($b, $l)), T($l, 'ft_code_cta'), brand_url($b, $l), logo_img($b, $l, 64));
  my %own = map { my $v = $FEAT->{$_}; ($_ => ref $v ? $v->{$l} : $v) } grep { $FEAT->{$_} } qw(title text cta url);
  ($title, $text, $cta) = map { defined $own{$_->[0]} ? esc($own{$_->[0]}) : $_->[1] } [title => $title], [text => $text], [cta => $cta];
  $url = $own{url} if $own{url};
  $text .= ' · ' . T($l, 'ft_until', date => fmt_date($l, $FEAT->{until})) if $FEAT->{until};
  my $tag = T($l, $FEAT->{sponsored} ? 'ft_sponsored' : 'ft_label');
  my $rel = $url =~ m{^https?://} ? ($FEAT->{sponsored} ? ' rel="sponsored noopener"' : ' rel="noopener"') . ' target="_blank"' : '';
  my $until = $FEAT->{until} ? qq{ data-until="$FEAT->{until}"} : '';
  my $trk = qq{ data-brand="$key" data-sponsored="} . ($FEAT->{sponsored} ? 'yes' : 'no') . '"';   # views and clicks for the partner's report
  return qq{<aside class="wrap feat-slot" aria-label="$tag"$until data-track-view="featured_view"$trk><a class="feat" href="} . esc($url) . qq{"$rel data-track="featured_click"$trk>}
    . '<span class="logo-tile">' . ($logo =~ s/ loading="lazy"//r) . qq{</span><span class="feat-body"><span class="feat-tag">$tag</span>}
    . qq{<span class="feat-title">$title</span><span class="feat-text">$text</span></span>}
    . qq{<span class="feat-cta">$cta } . icon('arrow', 'flip') . '</span></a></aside>';
}
sub dd_qa { my ($l, @ds) = @_; map { [Te($l, 'dd_q', brand => dd_name($_, $l), day => dd_when($_, $l)), esc($_->{details}{$l}) . ' ' . T($l, 'dd_note')] } @ds }

# ------------------------------------------------------------------ pages
for my $l (@LANGS) {
  my $codes = path_for($l, '/promo-codes/');
  my $n = scalar @BRANDS;

  # ---------- home
  {
    my @stack = grep { $_ } map { $BYKEY{$_} } @{ $HOME->{heroCodes} || [qw(noon rabbit waffarha)] };   # data/home.json
    @stack = @stack[0 .. 2] if @stack > 3;
    my $stack = join '', map { qq{<div class="mini"><div class="mini-wrap">} . ticket($_, $l, mini => 1, eager => 1) . '</div></div>' } @stack;
    my $cats = join '', map {
      my $c = $_;
      qq{<a class="cat" href="$codes#$c"><span class="ic">} . icon($CATICON{$c}) . '</span><span><b>' . esc($CATN{$c}{$l}) . '</b><small>' . ncodes($l, count_cat($c)) . '</small></span>' . icon('arrow', 'go flip') . '</a>'
    } @CATS;
    my $featured = join '', map { ticket_li($_, $l) } grep { $_->{featured} } @BRANDS;
    my $logos = join '', map { brand_card($_, $l) } @BRANDS;
    my @facts = ([layers => nbrands($l, $n) =~ s/^(\d+)/<b>$1<\/b>/r], [pin => T($l, 'h_fact_region')]);
    push @facts, [shield => T($l, $NCHECKED < $NCODES ? 'h_fact_checked_n' : 'h_fact_checked', n => $NCHECKED, date => month_year($l, $VERIFIED[0]))] if $ALL_FRESH && @VERIFIED;
    push @facts, [gift => T($l, 'h_fact_free')];
    my $facts = join '', map { '<li>' . icon($_->[0]) . "<span>$_->[1]</span></li>" } @facts;
    my @qa = map { [T($l, "q$_"), T($l, "a$_", partners => path_for($l, '/partners/'))] } 1 .. 5;
    my $body = <<"HTML";
<section class="hero">
<div class="wrap hero-grid">
<div class="hero-copy">
<h1><span class="display">@{[ T($l, 'h_display') ]}</span></h1>
<p class="lede">@{[ T($l, 'h_lede') ]}</p>
@{[ search_form($l) ]}
<ul class="hero-facts">$facts</ul>
</div>
<div class="hero-art">
<p class="stack-label" aria-hidden="true"><span>@{[ T($l, 'h_top') ]}</span>@{[ icon('arrow', 'flip') ]}</p>
<div class="stack" role="group" aria-label="@{[ T($l, 'h_top') ]}">$stack</div>
<img class="sticker" src="$LOGO" alt="" width="150" height="59">
</div>
</div>
</section>
<div class="scallop" aria-hidden="true"></div>
@{[ featured_html($l) ]}
<section class="wrap section-tight" aria-labelledby="feat-title">
<div class="section-head"><div><p class="eyebrow">@{[ T($l, 'h_feat_eyebrow') ]}</p><h2 class="h2" id="feat-title">@{[ T($l, 'h_feat_title') ]}</h2><p class="section-sub">@{[ T($l, 'h_feat_sub') ]}</p></div>
<a class="btn btn-ink" href="$codes">@{[ T($l, 'h_see_all', n => $NCODES) ]} @{[ icon('arrow', 'flip') ]}</a></div>
<ul class="ticket-list">$featured</ul>
</section>
@{[ @DDEALS ? qq{<section class="wrap section-tight" aria-labelledby="dd-title"><div class="section-head"><div><p class="eyebrow">} . T($l, 'dd_eyebrow') . qq{</p><h2 class="h2" id="dd-title">} . T($l, 'dd_title') . '</h2><p class="section-sub">' . T($l, 'dd_sub') . qq{</p></div><a class="btn btn-ink" href="} . path_for($l, '/day-deals/') . '">' . T($l, 'dd_all') . ' ' . icon('arrow', 'flip') . '</a></div>' . dday_list($l, @DDEALS) . '</section>' : '' ]}
<section class="wrap section-tight" aria-labelledby="cats-title">
<div class="section-head"><div><p class="eyebrow">@{[ T($l, 'h_cat_eyebrow') ]}</p><h2 class="h2" id="cats-title">@{[ T($l, 'h_cat_title') ]}</h2></div></div>
<div class="cats">$cats</div>
</section>
<section class="wrap section-tight" aria-labelledby="how-title">
<div class="section-head"><div><p class="eyebrow">@{[ T($l, 'h_how_eyebrow') ]}</p><h2 class="h2" id="how-title">@{[ T($l, 'h_how_title') ]}</h2></div></div>
<ol class="steps">
<li class="step"><span class="num" aria-hidden="true">@{[ $l eq 'ar' ? '١' : '1' ]}</span><h3>@{[ T($l, 'h_s1') ]}</h3><p>@{[ T($l, 'h_s1p') ]}</p></li>
<li class="step"><span class="num" aria-hidden="true">@{[ $l eq 'ar' ? '٢' : '2' ]}</span><h3>@{[ T($l, 'h_s2') ]}</h3><p>@{[ T($l, 'h_s2p') ]}</p></li>
<li class="step"><span class="num" aria-hidden="true">@{[ $l eq 'ar' ? '٣' : '3' ]}</span><h3>@{[ T($l, 'h_s3') ]}</h3><p>@{[ T($l, 'h_s3p') ]}</p></li>
</ol>
</section>
<section class="wrap section-tight" aria-labelledby="brands-title">
<div class="section-head"><div><p class="eyebrow">@{[ T($l, 'h_brands_eyebrow') ]}</p><h2 class="h2" id="brands-title">@{[ T($l, 'h_brands_title') ]}</h2><p class="section-sub">@{[ T($l, 'h_brands_sub') ]}</p></div>
<a class="btn btn-ink" href="$codes">@{[ T($l, 'h_see_all', n => $NCODES) ]} @{[ icon('arrow', 'flip') ]}</a></div>
<ul class="brand-cards">$logos</ul>
</section>
@{[ app_section($l) ]}
<section class="wrap section-tight" aria-labelledby="why-title">
<div class="section-head"><div><p class="eyebrow">@{[ T($l, 'h_why_eyebrow') ]}</p><h2 class="h2" id="why-title">@{[ T($l, 'h_why_title') ]}</h2></div></div>
<ul class="why">
<li>@{[ icon('layers') ]}<h3>@{[ T($l, 'h_w1') ]}</h3><p>@{[ T($l, 'h_w1p') ]}</p></li>
<li>@{[ icon('list') ]}<h3>@{[ T($l, 'h_w2') ]}</h3><p>@{[ T($l, 'h_w2p') ]}</p></li>
<li>@{[ icon('lang') ]}<h3>@{[ T($l, 'h_w3') ]}</h3><p>@{[ T($l, 'h_w3p') ]}</p></li>
<li>@{[ icon('gift') ]}<h3>@{[ T($l, 'h_w4') ]}</h3><p>@{[ T($l, 'h_w4p') ]}</p></li>
</ul>
</section>
@{[ band($l) ]}
<section class="wrap section-tight two-col" aria-labelledby="faq-title">
<div><p class="eyebrow">@{[ T($l, 'faq_eyebrow') ]}</p><h2 class="h2" id="faq-title">@{[ T($l, 'faq_title') ]}</h2></div>
@{[ faq_html(@qa) ]}
</section>
HTML
    layout(lang => $l, key => '/', title => T($l, 'h_title'), desc => T($l, 'h_desc'), body => $body,
      ld => [ faq_ld(@qa), { '@type' => 'MobileApplication', name => 'Foodidu', alternateName => 'فوديدو', operatingSystem => 'Android',
        applicationCategory => 'LifestyleApplication', installUrl => $PLAY_URL, url => $PLAY_URL, description => strip_tags(T($l, 'app_sub')),
        publisher => { '@id' => "$SITE/#org" }, offers => { '@type' => 'Offer', price => '0', priceCurrency => 'EGP' } } ],
      fd => { brands => search_index($l) }, og => "/img/og/home-$l.png");
  }

  # ---------- all codes
  {
    my $chips = qq{<button type="button" class="chip" data-filter="cat" data-value="all" aria-pressed="true">} . T($l, 'all') . qq{ <span class="n">$NCODES</span></button>}
      . join('', map { qq{<button type="button" class="chip" data-filter="cat" data-value="$_" aria-pressed="false">} . icon($CATICON{$_}) . esc($CATN{$_}{$l}) . ' <span class="n">' . count_cat($_) . '</span></button>' } @CATS)
      . '<span class="sep" aria-hidden="true"></span>'
      . qq{<button type="button" class="chip" data-filter="region" data-value="all" aria-pressed="true">} . T($l, 'all_regions') . '</button>'
      . join('', map { qq{<button type="button" class="chip" data-filter="region" data-value="$_" aria-pressed="false">} . icon('pin') . T($l, $_) . '</button>' } qw(eg gcc));
    my $groups = join '', map {
      my $c = $_;
      my @bs = map { offers_of($_) } grep { $_->{category} eq $c } @BRANDS;
      qq{<section class="group" data-group id="$c" aria-labelledby="g-$c"><div class="group-head"><span class="ic">} . icon($CATICON{$c}) . qq{</span><h2 id="g-$c">} . T($l, "c_group_$c") . '</h2><span class="n">' . ncodes($l, scalar @bs) . '</span></div>'
      . '<ul class="ticket-list">' . join('', map { ticket_li($_, $l) } @bs) . '</ul></section>';
    } @CATS;
    my $crumbs = [[T($l, 'home'), path_for($l, '/')], [T($l, 'c_h1'), $codes]];
    my $body = <<"HTML";
<section class="page-hero">
<div class="wrap">
@{[ crumbs_html($l, $crumbs) ]}
<h1>@{[ T($l, 'c_h1') ]}</h1>
<p class="lede">@{[ T($l, 'c_lede', n => nbrands($l, $n)) ]}</p>
@{[ search_form($l) ]}
</div>
</section>
<div class="scallop" aria-hidden="true"></div>
<section class="wrap section-tight">
<div class="filters" role="group" aria-label="@{[ T($l, 'c_filters') ]}">$chips</div>
<div id="codes" data-filterable>$groups</div>
<p class="empty" data-empty hidden>@{[ T($l, 'c_empty') ]}</p>
</section>
@{[ band($l) ]}
HTML
    my $i = 0;
    layout(lang => $l, key => '/promo-codes/', title => T($l, 'c_title') . ' | Foodidu', desc => T($l, 'c_desc'), body => $body, nav => 'codes',
      crumbs => $crumbs, pagetype => 'CollectionPage', og => "/img/og/codes-$l.png", fd => { brands => search_index($l) },
      ld => [ { '@type' => 'ItemList', name => T($l, 'c_h1'), numberOfItems => $n,
        itemListElement => [ map { { '@type' => 'ListItem', position => ++$i, name => $_->{name}{$l}, url => absu(brand_url($_, $l)) } } @BRANDS ] } ]);
  }

  # ---------- day deals page
  if (@DDEALS) {
    my $groups = join '', map {
      my $day = $_;
      my @ds = grep { my $d = $_; grep { $_ eq $day } @{ $d->{days} } } @DDEALS;
      @ds ? qq{<section class="group" id="$day" aria-labelledby="g-$day"><div class="group-head"><span class="ic">} . icon('calendar') . qq{</span><h2 id="g-$day">} . T($l, 'dd_day_h2', day => $DAYN{$l}{$day}) . '</h2></div>' . dday_list($l, @ds) . '</section>' : '';
    } @DAYS;
    my @qa = dd_qa($l, @DDEALS);
    my ($first) = ((grep { $_->{featured} } @DDEALS), $DDEALS[0]);   # the deal named in the page title
    my %fv = (brand => dd_name($first, $l), day => dd_when($first, $l));
    my $tbase = T($l, 'dd_page_title', %fv);
    my $crumbs = [[T($l, 'home'), path_for($l, '/')], [T($l, 'dd_h1'), path_for($l, '/day-deals/')]];
    my $social = join '', map { qq{<a class="btn btn-line" href="$_->[2]" rel="noopener" target="_blank">} . icon($_->[0]) . " $_->[1]</a>" } @SOCIAL[0, 1];
    my $body = <<"HTML";
<section class="page-hero">
<div class="wrap">
@{[ crumbs_html($l, $crumbs) ]}
<h1>@{[ T($l, 'dd_h1') ]}</h1>
<p class="lede">@{[ T($l, 'dd_lede') ]}</p>
</div>
</section>
<div class="scallop" aria-hidden="true"></div>
<section class="wrap section-tight">
$groups
<p class="note">@{[ T($l, 'dd_note') ]}</p>
<div class="dd-know"><div><h2>@{[ T($l, 'dd_know') ]}</h2><p>@{[ T($l, 'dd_know_p') ]}</p></div><div class="dd-know-links">$social</div></div>
</section>
<section class="wrap section-tight two-col" aria-labelledby="ddfaq-title">
<div><p class="eyebrow">@{[ T($l, 'faq_eyebrow') ]}</p><h2 class="h2" id="ddfaq-title">@{[ T($l, 'faq_title') ]}</h2></div>
@{[ faq_html(@qa) ]}
</section>
HTML
    layout(lang => $l, key => '/day-deals/', title => (length($tbase) + 10 <= 65 ? "$tbase | Foodidu" : $tbase), desc => T($l, 'dd_page_desc', %fv),
      body => $body, nav => 'daydeals', crumbs => $crumbs, pagetype => 'CollectionPage', og => "/img/og/day-deals-$l.png",
      ld => [ faq_ld(@qa) ], lastmod => $DD_DATE);
  }

  # ---------- restaurant offer pages
  for my $r (@RESTS) {
    my $name = $r->{name}{$l};
    my $en = esc($name);
    my $url = rest_url($r, $l);
    my @os = @{ $r->{offers} };
    my $min = fmt_n(rest_min($r));
    my $cheap = (sort { $a->{price} <=> $b->{price} } @os)[0];
    my $is_fresh = fresh($r->{lastChecked});
    my $tbase = $r->{seo}{$l}{title} . ($is_fresh ? ' (' . month_year($l, $r->{lastChecked}) . ')' : '');
    my $checked = $r->{lastChecked} ? '<p class="checked">' . icon('shield') . T($l, 'ro_checked', date => fmt_date($l, $r->{lastChecked})) . '</p>' : '';
    $checked .= '<p class="checked">' . icon('calendar') . T($l, 'ro_valid', date => fmt_date($l, $r->{validUntil})) . '</p>' if $r->{validUntil};
    my $menu = esc($r->{menu}{$l} // $r->{website});
    my $actions = qq{<div class="coupon-actions"><a class="btn btn-leaf" href="$menu" rel="nofollow noopener" target="_blank" data-track="restaurant_order_click" data-brand="$r->{key}">} . T($l, 'ro_order', name => $en) . ' ' . icon('external') . '</a>'
      . ($r->{phone} ? qq{<a class="btn btn-line" href="tel:$r->{phone}" data-track="restaurant_call_click" data-brand="$r->{key}">} . icon('phone') . ' ' . T($l, 'ro_call', phone => "<bdi>$r->{phone}</bdi>") . '</a>' : '') . '</div>';
    my $list = join($l eq 'ar' ? '، ' : ', ', map { esc(oname($_, $l)) . ' (' . fmt_n($_->{price}) . ' ' . T($l, 'egp') . ')' } @os);
    my @qa = (
      [Te($l, 'ro_q1', name => $name), T($l, 'ro_a1', name => $en, count => noffers($l, scalar @os), list => $list)],
      [Te($l, 'ro_q2', name => $name), T($l, 'ro_a2', offer => esc(oname($cheap, $l)), price => fmt_n($cheap->{price}), items => esc($cheap->{items}{$l}))],
      [Te($l, 'ro_q3', name => $name), T($l, 'ro_a3', name => $en, phone => $r->{phone} // '')],
      [T($l, 'ro_q4'), T($l, 'ro_a4', name => $en, date => fmt_date($l, $r->{lastChecked} // $RO_DATE))],
    );
    my $crumbs = [[T($l, 'home'), path_for($l, '/')], [T($l, 'ro_h1', name => $name), $url]];
    my $cards = join '', map { '<li>' . moffer_card($_, $l, 'h3') . '</li>' } @os;
    my $i = 0;
    my $body = <<"HTML";
<section class="page-hero">
<div class="wrap">
@{[ crumbs_html($l, $crumbs) ]}
<div class="brand-id"><span class="logo-tile">@{[ rest_logo($r, $l, 88) ]}</span><div class="pill-row"><span class="pill">@{[ icon($CATICON{$r->{category}} // 'fork') ]}@{[ esc($CATN{$r->{category}}{$l}) ]}</span><span class="pill">@{[ icon('pin') ]}@{[ region_label($r, $l) ]}</span></div></div>
<h1>@{[ Te($l, 'ro_h1', name => $name) ]}</h1>
<p class="lede">@{[ T($l, 'ro_lede', count => noffers($l, scalar @os), min => $min, max => rest_max_save($r)) ]}</p>
$checked
$actions
</div>
</section>
<div class="scallop" aria-hidden="true"></div>
<section class="wrap section-tight" aria-labelledby="ro-list-title">
<h2 class="sr-only" id="ro-list-title">@{[ Te($l, 'ro_all', name => $name) ]}</h2>
<ul class="moffer-list all">$cards</ul>
<p class="note">@{[ Te($l, 'ro_src', name => $name) ]}</p>
</section>
<div class="wrap brand-body ro-body">
<article class="prose">
<section aria-labelledby="how-title"><h2 id="how-title">@{[ Te($l, 'ro_how', name => $name) ]}</h2>
<ol class="how">
<li><div><b>@{[ Te($l, 'ro_s1', name => $name) ]}</b><span>@{[ T($l, 'ro_s1p') ]}</span></div></li>
<li><div><b>@{[ T($l, 'ro_s2') ]}</b><span>@{[ T($l, 'ro_s2p') ]}</span></div></li>
<li><div><b>@{[ T($l, 'ro_s3') ]}</b><span>@{[ T($l, 'ro_s3p', phone => qq{<bdi>$r->{phone}</bdi>}) ]}</span></div></li>
</ol></section>
<section aria-labelledby="about-title"><h2 id="about-title">@{[ Te($l, 'b_about', name => $name) ]}</h2><p>@{[ esc($r->{about}{$l}) ]}</p></section>
<section aria-labelledby="faq-title"><h2 id="faq-title">@{[ T($l, 'faq_title') ]}</h2>@{[ faq_html(@qa) ]}</section>
</article>
</div>
@{[ band($l) ]}
HTML
    layout(lang => $l, key => "/$r->{slug}/", title => (length($tbase) + 10 <= 65 ? "$tbase | Foodidu" : $tbase), desc => $r->{seo}{$l}{description},
      body => $body, crumbs => $crumbs, og => "/img/og/$r->{key}-$l.png",
      about => { '@type' => 'Restaurant', name => $r->{name}{en}, alternateName => $r->{name}{ar}, url => $r->{website}, ($r->{phone} ? (telephone => $r->{phone}) : ()), servesCuisine => $r->{cuisine} // [] },
      ld => [ faq_ld(@qa), { '@type' => 'ItemList', name => T($l, 'ro_h1', name => $name), numberOfItems => scalar @os,
        itemListElement => [ map { { '@type' => 'ListItem', position => ++$i, item => { '@type' => 'Offer', name => oname($_, $l), description => $_->{items}{$l}, price => $_->{price}, priceCurrency => 'EGP', ($r->{validUntil} ? (priceValidUntil => $r->{validUntil}) : ()), url => $r->{menu}{$l} // $r->{website} } } } @os ] } ],
      lastmod => (sort grep { $_ } $r->{lastChecked}, $RO_DATE)[-1]);
  }

  # ---------- brand pages
  for my $b (@BRANDS) {
    my $name = $b->{name}{$l};
    my $en = esc($name);
    my $url = brand_url($b, $l);
    my $where = esc($b->{where}{$l});
    my $offer = esc($b->{offer}{$l});
    my $terms = esc($b->{terms}{$l});
    my $code = esc($b->{code});
    my @offers = offers_of($b);
    my $multi = @offers > 1;
    my $strong = sub { '<strong dir="ltr">' . esc($_[0]{code}) . '</strong>' };
    my $codes_or = join($l eq 'ar' ? ' أو ' : ' or ', map { $strong->($_) } @offers);
    my $is_fresh = fresh($b->{lastVerified});
    my $tbase = $b->{seo}{$l}{title} . ($is_fresh ? ' (' . month_year($l, $b->{lastVerified}) . ')' : '');
    my $title = length($tbase) + 10 <= 65 ? "$tbase | Foodidu" : $tbase;   # keep the month visible in Google; drop the suffix if too long
    my $verified = $is_fresh ? '<span class="bp-check" role="img" aria-label="' . T($l, 'b_f_checked') . '" title="' . T($l, 'b_f_checked') . '">' . icon('check') . '</span>' : '';
    my @facts = ([pin => T($l, 'b_f_region'), region_label($b, $l)], [store => T($l, 'b_f_where'), $where]);
    push @facts, [shield => T($l, 'b_f_checked'), fmt_date($l, $b->{lastVerified})] if $is_fresh;
    push @facts, [gift => T($l, 'b_f_cost'), T($l, 'h_fact_free')];
    my $facts = join '', map { '<li>' . icon($_->[0]) . "<span><small>$_->[1]</small><b>$_->[2]</b></span></li>" } @facts;
    my $go = $b->{url} ? qq{<a class="btn btn-leaf" href="} . esc($b->{url}) . qq{" rel="nofollow sponsored noopener" target="_blank" data-track="brand_link_click" data-brand="$b->{key}">} . ($b->{urlLabel} ? esc($b->{urlLabel}{$l}) : Te($l, 'b_go', name => $name)) . ' ' . icon('external') . '</a>' : '';
    my $lede = $multi ? ncodes($l, scalar @offers) . ': ' . join($l eq 'ar' ? '، أو ' : ', or ', map { esc($_->{offer}{$l}) } @offers) : $offer;
    my $a1 = $multi
      ? T($l, 'b_a1_multi', name => $en, list => join($l eq 'ar' ? '، و' : ' and ', map { ($l eq 'ar' ? 'كود ' : '') . $strong->($_) . ' (' . esc($_->{offer}{$l}) . ')' } @offers))
      : T($l, 'b_a1', name => $en, code => qq{<strong dir="ltr">$code</strong>}, offer => $offer);
    my @qa = (
      [Te($l, 'b_q1', name => $name), $a1],
      [Te($l, 'b_q2', name => $name), T($l, 'b_a2', code => $codes_or, where => $where)],
      [T($l, 'b_q3'), $multi ? join(' ', map { $strong->($_) . ': ' . esc($_->{terms}{$l}) } @offers) : $terms],
      [Te($l, 'b_q4', name => $name), Te($l, 'b_a4', name => $name)],
    );
    my @bdd = grep { ($_->{brand} // '') eq $b->{key} } @DDEALS;
    push @qa, dd_qa($l, @bdd);
    my $bdd = @bdd ? qq{<section aria-labelledby="bdd-title"><h2 id="bdd-title">} . Te($l, 'dd_brand_h2', brand => $name, day => dd_when($bdd[0], $l)) . '</h2>'
      . dday_list($l, @bdd) . '<p class="dd-more"><a href="' . path_for($l, '/day-deals/') . '">' . T($l, 'dd_all') . ' ' . icon('arrow', 'flip') . '</a></p></section>' : '';
    my $coupons = join '', map {
      qq{<div class="coupon-card"><div class="ticket"><div class="ticket-main">} . deal_html($_, $l)
      . '<p class="terms">' . icon('info') . '<span><strong>' . T($l, 'b_terms') . ':</strong> ' . esc($_->{terms}{$l}) . '</span></p>'
      . '</div><div class="ticket-stub">' . code_btn($_, $l, 1) . '</div></div></div>'
    } @offers;
    my $side_codes = join '', map { code_btn($_, $l, 1) } @offers;
    my @same = grep { $_->{category} eq $b->{category} && $_ ne $b } @BRANDS;
    my @rest = grep { $_->{category} ne $b->{category} } @BRANDS;
    my @related = (@same, @rest)[0 .. 2];
    my $related = join '', map { ticket_li($_, $l) } @related;
    my $sidecats = join '', map { qq{<li><a href="} . path_for($l, '/promo-codes/') . qq{#$_"><span class="logo-tile">} . icon($CATICON{$_}) . '</span><span><b>' . esc($CATN{$_}{$l}) . '</b><small>' . ncodes($l, count_cat($_)) . '</small></span></a></li>' } @CATS;
    my $crumbs = [[T($l, 'home'), path_for($l, '/')], [T($l, 'c_h1'), path_for($l, '/promo-codes/')], [$name, $url]];
    my $flag = $b->{exclusive} ? '<span class="pill pill-leaf">' . icon('gift') . T($l, 'exclusive') . '</span>' : '';
    my $count = $multi ? '<span class="pill">' . icon('tag') . ncodes($l, scalar @offers) . '</span>' : '';
    my $body = <<"HTML";
<section class="page-hero brand-hero">
<div class="wrap">
@{[ crumbs_html($l, $crumbs) ]}
<div class="bp">
<div class="bp-id"><span class="bp-logo"><span class="logo-tile">@{[ logo_img($b, $l, 104, 1) ]}</span>$verified</span>
<div class="bp-head"><div class="pill-row"><span class="pill">@{[ icon($CATICON{$b->{category}}) ]}@{[ esc($CATN{$b->{category}}{$l}) ]}</span>$flag$count</div>
<h1>@{[ Te($l, $multi ? 'b_h1_multi' : 'b_h1', name => $name) ]}</h1></div></div>
<p class="lede bp-lede">$lede</p>
<div class="coupons bp-coupons@{[ $multi ? ' multi' : '' ]}">
$coupons
@{[ $go ? qq{<div class="coupon-actions">$go</div>} : '' ]}
</div>
<ul class="bp-facts">$facts</ul>
</div>
</div>
</section>
<div class="scallop" aria-hidden="true"></div>
<div class="wrap brand-body">
<article class="prose">
<section aria-labelledby="how-title"><h2 id="how-title">@{[ Te($l, 'b_how', name => $name) ]}</h2>
<ol class="how">
<li><div><b>@{[ T($l, 'b_st1') ]}</b><span>@{[ $multi ? T($l, 'b_st1p_multi') : T($l, 'b_st1p', code => qq{<strong dir="ltr">$code</strong>}) ]}</span></div></li>
<li><div><b>@{[ T($l, 'b_st2', where => $where) ]}</b><span>@{[ T($l, 'b_st2p') ]}</span></div></li>
<li><div><b>@{[ T($l, 'b_st3') ]}</b><span>@{[ T($l, 'b_st3p') ]}</span></div></li>
</ol></section>
<section aria-labelledby="about-title"><h2 id="about-title">@{[ Te($l, 'b_about', name => $name) ]}</h2><p>@{[ esc($b->{about}{$l}) ]}</p></section>
$bdd
<section aria-labelledby="faq-title"><h2 id="faq-title">@{[ Te($l, 'b_faq', name => $name) ]}</h2>@{[ faq_html(@qa) ]}
<p class="note">@{[ Te($l, 'b_note', name => $name) ]}</p></section>
</article>
<aside class="side">
<div class="side-card side-codes"><h2>@{[ Te($l, $multi ? 'b_side_codes' : 'b_side_code', name => $name) ]}</h2>$side_codes</div>
<div class="side-card"><h2>@{[ T($l, 'b_side_cats') ]}</h2><ul class="side-list">$sidecats</ul></div>
</aside>
</div>
<section class="wrap section-tight" aria-labelledby="rel-title">
<div class="section-head"><h2 class="h2" id="rel-title">@{[ T($l, 'b_related', cat => T($l, "cat_def_$b->{category}")) ]}</h2></div>
<ul class="ticket-list">$related</ul>
</section>
HTML
    layout(lang => $l, key => "/$b->{slug}/", title => $title, desc => $b->{seo}{$l}{description}, body => $body, nav => 'codes',
      crumbs => $crumbs, og => "/img/og/$b->{key}-$l.png", about => { '@type' => 'Brand', name => $b->{name}{en}, alternateName => $b->{name}{ar} },
      ld => [ faq_ld(@qa) ], lastmod => (sort grep { $_ } $b->{lastVerified}, $DATA_DATE, (@bdd ? $DD_DATE : ()))[-1]);
  }

  # ---------- partners
  {
    my @qa = map { [T($l, "p_q$_"), T($l, "p_a$_")] } 1 .. 4;
    my $req = ' <span class="req" aria-hidden="true">*</span>';
    my $opts = join '', map { qq{<option value="$_->[0]">} . T($l, $_->[1]) . '</option>' } (['restaurant', 'f_restaurant'], ['cafe', 'f_cafe'], ['cloud-kitchen', 'f_cloud'], ['food-truck', 'f_truck'], ['bakery', 'f_bakery'], ['other', 'f_other']);
    my $crumbs = [[T($l, 'home'), path_for($l, '/')], [T($l, 'p_h1'), path_for($l, '/partners/')]];
    my $body = <<"HTML";
<section class="page-hero">
<div class="wrap">
@{[ crumbs_html($l, $crumbs) ]}
<h1>@{[ T($l, 'p_h1') ]}</h1>
<p class="lede">@{[ T($l, 'p_lede') ]}</p>
<p style="margin-top:24px"><a class="btn btn-ink" href="#apply">@{[ T($l, 'p_cta') ]} @{[ icon('arrow', 'flip') ]}</a></p>
</div>
</section>
<div class="scallop" aria-hidden="true"></div>
<section class="wrap section-tight" aria-labelledby="val-title">
<div class="section-head"><div><p class="eyebrow">@{[ T($l, 'p_v_eyebrow') ]}</p><h2 class="h2" id="val-title">@{[ T($l, 'p_v_title') ]}</h2></div></div>
<ul class="values">
<li><span class="ic">@{[ icon('target') ]}</span><h3>@{[ T($l, 'p_v1') ]}</h3><p>@{[ T($l, 'p_v1p') ]}</p></li>
<li><span class="ic">@{[ icon('page') ]}</span><h3>@{[ T($l, 'p_v2') ]}</h3><p>@{[ T($l, 'p_v2p') ]}</p></li>
<li><span class="ic">@{[ icon('sliders') ]}</span><h3>@{[ T($l, 'p_v3') ]}</h3><p>@{[ T($l, 'p_v3p') ]}</p></li>
</ul>
</section>
<section class="wrap section-tight" aria-labelledby="phow-title">
<div class="section-head"><h2 class="h2" id="phow-title">@{[ T($l, 'p_how_title') ]}</h2></div>
<ol class="steps">
<li class="step"><span class="num" aria-hidden="true">@{[ $l eq 'ar' ? '١' : '1' ]}</span><h3>@{[ T($l, 'p_s1') ]}</h3><p>@{[ T($l, 'p_s1p') ]}</p></li>
<li class="step"><span class="num" aria-hidden="true">@{[ $l eq 'ar' ? '٢' : '2' ]}</span><h3>@{[ T($l, 'p_s2') ]}</h3><p>@{[ T($l, 'p_s2p') ]}</p></li>
<li class="step"><span class="num" aria-hidden="true">@{[ $l eq 'ar' ? '٣' : '3' ]}</span><h3>@{[ T($l, 'p_s3') ]}</h3><p>@{[ T($l, 'p_s3p') ]}</p></li>
</ol>
</section>
<section class="wrap section-tight" id="apply" aria-labelledby="form-title">
<div class="form-card">
<h2 class="h2" id="form-title">@{[ T($l, 'p_form_title') ]}</h2>
<p class="section-sub" style="margin-bottom:24px">@{[ T($l, 'p_form_sub') ]}</p>
<form id="vendor-application-form" novalidate>
<div class="form-grid">
<div class="field"><label for="f-business">@{[ T($l, 'f_business') ]}$req</label><input id="f-business" name="businessName" required maxlength="200" autocomplete="organization"></div>
<div class="field"><label for="f-contact">@{[ T($l, 'f_contact') ]}$req</label><input id="f-contact" name="contactPerson" required maxlength="200" autocomplete="name" pattern="^[\\p{L}\\s\\-]+\$" aria-describedby="f-contact-hint"><span class="hint" id="f-contact-hint">@{[ T($l, 'f_contact_hint') ]}</span></div>
<div class="field"><label for="f-phone">@{[ T($l, 'f_phone') ]}$req</label><input id="f-phone" name="phone" type="tel" required maxlength="40" autocomplete="tel" inputmode="tel"></div>
<div class="field"><label for="f-email">@{[ T($l, 'f_email') ]}$req</label><input id="f-email" name="email" type="email" required maxlength="200" autocomplete="email"></div>
<div class="field"><label for="f-location">@{[ T($l, 'f_location') ]}$req</label><input id="f-location" name="location" required maxlength="300" placeholder="@{[ T($l, 'f_location_ph') ]}"></div>
<div class="field"><label for="f-type">@{[ T($l, 'f_type') ]}$req</label><select id="f-type" name="businessType" required><option value="">@{[ T($l, 'f_type_ph') ]}</option>$opts</select></div>
<div class="field full"><label for="f-desc">@{[ T($l, 'f_desc') ]}</label><textarea id="f-desc" name="description" maxlength="3000" placeholder="@{[ T($l, 'f_desc_ph') ]}"></textarea></div>
<div class="field full"><label for="f-web">@{[ T($l, 'f_web') ]}</label><input id="f-web" name="website" maxlength="500" inputmode="url" autocomplete="url"></div>
</div>
<div class="form-foot"><button class="btn btn-ink" type="submit">@{[ T($l, 'f_submit') ]}</button><small>@{[ T($l, 'f_privacy') ]} <a href="@{[ path_for($l, '/privacy-policy/') ]}">@{[ T($l, 'privacy') ]}</a></small></div>
<p class="form-status" id="form-status" role="status" tabindex="-1" hidden></p>
</form>
</div>
</section>
<section class="wrap section-tight two-col" aria-labelledby="pfaq-title">
<div><p class="eyebrow">@{[ T($l, 'faq_eyebrow') ]}</p><h2 class="h2" id="pfaq-title">@{[ T($l, 'faq_title') ]}</h2></div>
@{[ faq_html(@qa) ]}
</section>
HTML
    layout(lang => $l, key => '/partners/', title => T($l, 'p_title') . ' | Foodidu', desc => T($l, 'p_desc'), body => $body, nav => 'partners',
      crumbs => $crumbs, og => "/img/og/partners-$l.png", ld => [ faq_ld(@qa) ], fd => { formUrl => $FORM_URL });
  }

  # ---------- legal
  for my $doc (['privacy-policy', 'privacy', 'pr'], ['terms-and-conditions', 'terms', 'te']) {
    my ($slug, $file, $p) = @$doc;
    my $src = "$ROOT/content/$file.$l.html";
    my $content = slurp($src);
    $content =~ s/\{privacy\}/path_for($l, '\/privacy-policy\/')/ge;
    my $crumbs = [[T($l, 'home'), path_for($l, '/')], [T($l, "${p}_title"), path_for($l, "/$slug/")]];
    my $body = qq{<section class="page-hero"><div class="wrap">} . crumbs_html($l, $crumbs) . '<h1>' . T($l, "${p}_title") . '</h1><p class="updated">'
      . T($l, 'updated', date => ($l eq 'en' ? 'September 2026' : 'سبتمبر 2026')) . qq{</p></div></section><div class="scallop" aria-hidden="true"></div><div class="wrap legal">$content</div>};
    layout(lang => $l, key => "/$slug/", title => T($l, "${p}_seo"), desc => T($l, "${p}_desc"), body => $body, crumbs => $crumbs, lastmod => mdate($src));
  }
}

# ---------- 404 (bilingual, noindex)
{
  my $body = <<"HTML";
<section class="wrap lost">
<img src="/img/foodidu-logo.svg" alt="Foodidu" width="220" height="87">
<h1>This page went out for delivery.</h1>
<p>We couldn't find that page. The code you're looking for is probably on our promo codes page.</p>
<div class="row"><a class="btn btn-ink" href="/promo-codes/">Browse promo codes</a><a class="btn btn-line" href="/">Back to home</a></div>
<div lang="ar" dir="rtl" style="margin-top:48px">
<h2 class="h2">يبدو أن هذه الصفحة خرجت للتوصيل.</h2>
<p>لم نجد هذه الصفحة. الكود الذي تبحث عنه موجود غالباً في صفحة أكواد الخصم.</p>
<div class="row"><a class="btn btn-ink" href="/ar/promo-codes/">تصفّح أكواد الخصم</a><a class="btn btn-line" href="/ar/">العودة للرئيسية</a></div>
</div>
</section>
HTML
  layout(lang => 'en', key => '/404/', title => 'Page not found | Foodidu', desc => "We couldn't find that page.", body => $body, noindex => 1, nolang => 1, file => "$OUT/404.html");
}

# ------------------------------------------------------------------ sitemap, robots, manifest
{
  my %by;
  push @{ $by{$_->{key}} }, $_ for @PAGES;
  my $xml = qq{<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n};
  for my $key (sort { ($a eq '/' ? '' : $a) cmp ($b eq '/' ? '' : $b) } keys %by) {
    for my $p (sort { $a->{lang} cmp $b->{lang} } @{ $by{$key} }) {
      $xml .= "<url><loc>" . absu(path_for($p->{lang}, $key)) . "</loc><lastmod>$p->{lastmod}</lastmod>";
      $xml .= qq{<xhtml:link rel="alternate" hreflang="$_" href="} . absu(path_for($_, $key)) . '"/>' for @LANGS;
      $xml .= qq{<xhtml:link rel="alternate" hreflang="x-default" href="} . absu(path_for('en', $key)) . qq{"/></url>\n};
    }
  }
  $xml .= "</urlset>\n";
  spit("$OUT/sitemap.xml", $xml);
  spit("$OUT/robots.txt", "User-agent: *\nAllow: /\n\nSitemap: $SITE/sitemap.xml\n");
  spit("$OUT/site.webmanifest", JSON::PP->new->canonical->pretty->encode({
    name => 'Foodidu', short_name => 'Foodidu', description => 'Promo codes & discounts in Egypt and the GCC',
    start_url => '/', scope => '/', display => 'standalone', background_color => '#FFF9EB', theme_color => '#FFD15C',
    icons => [ { src => '/img/icon-192.png', sizes => '192x192', type => 'image/png' }, { src => '/img/icon-512.png', sizes => '512x512', type => 'image/png' } ] }));
  for my $f (['favicon.ico', 'img/favicon.ico'], ['apple-touch-icon.png', 'img/apple-touch-icon.png']) {
    my $src = "$ROOT/static/$f->[1]";
    spit("$OUT/$f->[0]", slurp($src, 1), 1) if -f $src;
  }
  printf "Built %d pages (%d indexable) into public/\n", scalar(@PAGES) + 1, scalar @PAGES;
}

# ------------------------------------------------------------------ /dashboard/ (internal: noindex, not in the sitemap)
# Everything the site holds, with health checks; live Google Analytics, Search Console and partner applications load
# in static/js/dashboard.js only after the owner signs in with Google.
{
  my $T = JSON::PP::true; my $F = JSON::PP::false;
  my ($appcheck) = slurp("$ROOT/static/js/site.js") =~ /APP_CHECK_SITE_KEY = "([^"]*)"/;
  my ($measurement) = slurp("$ROOT/static/js/site.js") =~ /measurementId: "([^"]+)"/;
  my @codes = map { my $b = $_; map { +{
      brand => $b->{name}{ar}, brandEn => $b->{name}{en}, key => $b->{key}, code => $_->{code}, offer => $_->{offer}{ar},
      category => $CATN{ $b->{category} }{ar}, region => strip_tags(region_label($b, 'ar')),
      exclusive => ($_->{exclusive} ? $T : $F), low => (($b->{priority} // '') eq 'low' ? $T : $F),
      checked => $b->{lastVerified}, page => brand_url($b, 'ar'), pageEn => brand_url($b, 'en') } } offers_of($b) } @BRANDS;
  my @rests = map { +{ key => $_->{key}, name => $_->{name}{ar}, offers => scalar(@{ $_->{offers} }), min => rest_min($_), save => rest_max_save($_),
      until => $_->{validUntil}, checked => $_->{lastChecked}, page => rest_url($_, 'ar'), menu => $_->{menu}{ar} // $_->{website} } } @RESTS;
  my @deals = map { my $d = $_; my $b = dd_brand($d) // dd_rest($d); +{ name => ($b ? $b->{name}{ar} : $d->{name}{ar}), title => $d->{title}{ar},
      days => [ map { $DAYN{ar}{$_} } @{ $d->{days} } ], checked => $d->{lastChecked}, source => $d->{source} } } @DDEALS;
  my $fk = $FEAT->{partner} // '';
  my ($fr) = grep { $_->{key} eq $fk } @RESTS;
  my $fp = $fr // $BYKEY{$fk};
  my %data = (
    built => (sort { $b cmp $a } $DATA_DATE, $RO_DATE, $DD_DATE, mdate($FT_FILE))[0],   # newest data file's date: stable between builds
    site => $SITE, pages => scalar(@PAGES),
    codes => \@codes, restaurants => \@rests, deals => \@deals,
    featured => ($fp ? { active => ($FEAT->{active} ? $T : $F), partner => $fp->{name}{ar}, until => $FEAT->{until}, sponsored => ($FEAT->{sponsored} ? $T : $F),
      page => ($fr ? rest_url($fr, 'ar') : brand_url($fp, 'ar')) } : undef),
    appCheck => ($appcheck ? $T : $F), ga => { measurementId => $measurement }, gsc => { site => "$SITE/" }, play => $PLAY_URL,
    assets => { admin => asset('/js/admin.js'), art => asset('/js/art.js') }, repo => 'Abdelrahmann1/foodidu_website',
  );
  my $json = JSON::PP->new->canonical->encode(\%data); $json =~ s{</}{<\\/}g;
  my ($css, $dcss, $djs) = (asset('/css/site.css'), asset('/css/dashboard.css'), asset('/js/dashboard.js'));
  spit("$OUT/dashboard/index.html", <<"HTML");
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>لوحة تحكم Foodidu</title>
<meta name="description" content="لوحة التحكم الداخلية لفريق Foodidu: المحتوى والإحصائيات وطلبات الشراكة.">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#FFD15C">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lalezar&amp;family=Readex+Pro:wght\@300..700&amp;display=swap">
<link rel="stylesheet" href="$css">
<link rel="stylesheet" href="$dcss">
<script src="$djs" defer></script>
</head>
<body class="dash-body">
<header class="dash-top">
<div class="dash-wrap dash-top-in">
<a class="dash-brand" href="/ar/"><img src="$LOGO" width="120" height="48" alt="Foodidu"><span>لوحة التحكم</span></a>
<div class="dash-auth" id="dash-auth"></div>
</div>
<nav class="dash-tabs dash-wrap" aria-label="أقسام لوحة التحكم">
<a href="#overview">نظرة عامة</a><a href="#content">المحتوى</a><a href="#manage">إدارة المحتوى</a><a href="#visitors">الزوار</a><a href="#google">جوجل</a><a href="#applications">طلبات الشراكة</a><a href="#tools">الأدوات</a>
</nav>
</header>
<main id="main" class="dash dash-wrap">
<noscript><p class="dash-note">لوحة التحكم محتاجة JavaScript.</p></noscript>
<section id="overview" class="dash-sec" aria-labelledby="h-overview"></section>
<section id="content" class="dash-sec" aria-labelledby="h-content"></section>
<section id="manage" class="dash-sec" aria-labelledby="h-manage"></section>
<div class="dash-range" id="dash-range"></div>
<section id="visitors" class="dash-sec" aria-labelledby="h-visitors"></section>
<section id="google" class="dash-sec" aria-labelledby="h-google"></section>
<section id="applications" class="dash-sec" aria-labelledby="h-applications"></section>
<section id="tools" class="dash-sec" aria-labelledby="h-tools"></section>
<p class="dash-foot">آخر تحديث لبيانات المحتوى: <bdi>$data{built}</bdi> · الصفحة دي مش ظاهرة في جوجل.</p>
</main>
<script type="application/json" id="dash-data">$json</script>
</body>
</html>
HTML
  print "Built /dashboard/ (noindex)\n";
}
