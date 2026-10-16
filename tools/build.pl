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
  ['whatsapp',  'WhatsApp',  'https://whatsapp.com/channel/0029VbDn2NXK0IBiEFwKWp25'],
  ['facebook',  'Facebook',  'https://www.facebook.com/Foodidu.EG'],
  ['instagram', 'Instagram', 'https://www.instagram.com/foodidu_official'],
  ['tiktok',    'TikTok',    'https://www.tiktok.com/@foodidu_'],
  ['linkedin',  'LinkedIn',  'https://www.linkedin.com/company/foodidu/'],
);
my ($WA) = map { $_->[2] } grep { $_->[0] eq 'whatsapp' } @SOCIAL;   # the WhatsApp channel: follow cards on the pages

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
# Brand order everywhere (codes page, home cards, related codes, footer, search): "priority": "top" first (the codes that
# earn money), then the rest, then "low" (codes that are not from partners); inside each group, the order of brands.json.
@BRANDS = map { my $p = $_; grep { ($_->{priority} // '') eq $p } @BRANDS } ('top', '', 'low');
my %CATN   = %{ $DATA->{categories} };
my @CATS   = qw(restaurants groceries shopping);
my %CATICON = (restaurants => 'fork', groceries => 'basket', shopping => 'bag');
my $DATA_DATE = mdate("$ROOT/data/brands.json");
my $DD_FILE = "$ROOT/data/day-deals.json";
my @DDEALS = -f $DD_FILE ? @{ JSON::PP->new->utf8->decode(slurp($DD_FILE, 1))->{deals} // [] } : ();
my $DD_DATE = -f $DD_FILE ? mdate($DD_FILE) : $DATA_DATE;
# Amazon picks (data/amazon-picks.json): products the owner chose himself, listed on that brand's page with his affiliate tag.
# Only the product ID (ASIN) is stored; no prices, because Amazon's rules allow only prices that update from Amazon itself.
my $PK_FILE = "$ROOT/data/amazon-picks.json";
my $PICKS = -f $PK_FILE ? JSON::PP->new->utf8->decode(slurp($PK_FILE, 1)) : { items => [] };
for my $p (@{ $PICKS->{items} }) {
  die "data/amazon-picks.json: \"" . ($p->{asin} // '') . "\" is not an Amazon product ID (10 capital letters or digits)\n" unless ($p->{asin} // '') =~ /^[A-Z0-9]{10}$/;
  for my $k (qw(name note)) { die "data/amazon-picks.json: $p->{asin} needs \"$k\" in English and Arabic\n" unless $p->{$k}{en} && $p->{$k}{ar} }
  die "data/amazon-picks.json: $p->{asin} has an unknown icon \"$p->{icon}\"\n" if $p->{icon} && $p->{icon} !~ /^(?:coffee|milk|rice|oil|flour|drop|roll|bottle)$/;
}
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
my @FO;   # first-order codes, filled once the brands are loaded (used by the footer and /first-order-promo-codes/)
my $FEAT = -f $FT_FILE ? JSON::PP->new->utf8->decode(slurp($FT_FILE, 1)) : {};
my $HOME_FILE = "$ROOT/data/home.json";
my $HOME = -f $HOME_FILE ? JSON::PP->new->utf8->decode(slurp($HOME_FILE, 1)) : {};
my $BIZ_FILE = "$ROOT/data/business.json";
my $BIZ = -f $BIZ_FILE ? JSON::PP->new->utf8->decode(slurp($BIZ_FILE, 1)) : undef;   # Foodidu Business: /business/ and its service pages
my $BLOG_FILE = "$ROOT/data/blog.json";
my @POSTS = -f $BLOG_FILE ? @{ JSON::PP->new->utf8->decode(slurp($BLOG_FILE, 1))->{posts} // [] } : ();
my @PUB = sort { $b->{published} cmp $a->{published} } grep { ($_->{status} // '') eq 'published' } @POSTS;   # published articles, newest first
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
  cookie_settings => 'Cookie settings', made => 'Made with love for food lovers.', disclaimer => 'Brand names and logos belong to their owners. As an Amazon Associate, Foodidu earns from qualifying purchases.',
  cookie_text => 'We use cookies to understand how Foodidu is used and to improve it.', accept => 'Accept', decline => 'Decline', cookies => 'Cookies',
  # home
  h_title => 'Foodidu – Promo Codes & Discounts in Egypt and the GCC',
  h_desc => 'Promo codes for KFC, Pizza Hut, noon, Rabbit, Breadfast and more, all in one place and in Arabic and English. Copy a code, check the conditions and save.',
  h_display => 'Every bite,<br> <em>a better price</em>',
  h_lede => 'Copy promo codes for KFC, Pizza Hut, Rabbit, noon and more, with the conditions spelled out before you order. Free, no sign-up.',
  h_fact_region => 'Egypt & GCC', h_fact_free => 'Free, no sign-up', h_top => 'Picked for you', h_swipe => 'Swipe',
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
  ro_card_save => 'Save up to', ro_more => 'More restaurant offers and codes', b_all_cat => 'All {cat} codes',
  fo_title => 'First Order Promo Codes: Restaurants, Groceries & More', fo_h1 => 'First order promo codes',
  fo_desc => '{n} first-order promo codes from {list} and more. Copy a code and use it on the first order of your new account in Egypt or the GCC.',
  fo_lede => 'Every code that works on your first order, in one place: {n} from {b}. They are for new accounts on each app or website.',
  fo_how => 'How to use a first-order code', fo_s1 => 'Create a new account', fo_s1p => 'Sign up on the app or website. These codes are usually for numbers and emails that have not ordered before.',
  fo_s2 => 'Add your order', fo_s2p => 'Check the conditions under the code: some need a minimum order amount.', fo_s3 => 'Paste the code before you pay', fo_s3p => 'Copy the code here and paste it in the promo code field at checkout.',
  fo_q1 => 'What is a first-order promo code?', fo_a1 => 'A code that gives you a discount on the first order from your account on an app or website. It usually stops working after that first order.',
  fo_q2 => 'Can I use more than one first-order code?', fo_a2 => 'Yes, one per app: each app has its own first-order code. You usually cannot combine two codes in the same order.',
  fo_q3 => 'Why is my first-order code not working?', fo_a3 => 'Usually because the account or phone number already placed an order, or the order is below the minimum amount. Check the conditions under each code.',
  fo_all => 'All first-order codes',
  c_rest_title => 'Restaurant menu offers (no code needed)', c_rest_sub => 'Deals from official restaurant menus, with the menu price for comparison.',
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
  band_title => 'Own a restaurant or food brand?', band_text => 'A QR menu, a loyalty program, your own ordering website, your restaurant on Google Maps, and your promo code in front of people who are about to order. Start free.', band_btn => 'Discover Foodidu Business',
  faq_eyebrow => 'FAQ', faq_title => 'Questions, answered',
  # codes page
  c_title => 'All Promo Codes: Restaurants, Groceries & Shopping',
  c_desc => 'Browse every Foodidu promo code in one list: restaurants like KFC and Pizza Hut, grocery apps like Rabbit and Breadfast, and noon for online shopping.',
  c_h1 => 'All promo codes', c_lede => 'Every Foodidu code in one place: {n} across restaurants, grocery apps and online shopping in Egypt and the GCC.',
  c_group_restaurants => 'Restaurant promo codes', c_group_groceries => 'Grocery promo codes', c_group_shopping => 'Online shopping promo codes',
  c_empty => 'No codes match this filter.', c_filters => 'Filter codes',
  # brand page
  nocode => 'No code needed', nocode_go => 'Order', nocode_aria => '{name}: no code needed, order from {where}',
  nocode_shop => 'Shop', nocode_shop_aria => '{name}: no code needed, shop on {where}',
  pk_h2 => 'Foodidu picks on Amazon', pk_go => 'See it on Amazon', pk_eyebrow => 'Amazon Egypt', pk_all => 'All Amazon picks',
  pk_note => 'Products we picked on Amazon Egypt. These are affiliate links: Foodidu may earn a commission on qualifying purchases, at no extra cost to you. Prices change on Amazon, so check the price on the product page.',
  blog_nav => 'Blog', blog_h1 => 'Foodidu blog', blog_eyebrow => 'From the blog', blog_all => 'All articles', blog_read => 'Read the article', blog_title => 'Foodidu Blog: Saving Guides, Sale Dates and Promo Codes',
  blog_desc => 'Guides to save on food delivery, groceries and online shopping in Egypt and the GCC: sale season dates, how promo codes work, and which codes to use.',
  blog_lede => 'Practical guides to pay less: sale season dates, how promo codes work, and the codes we test ourselves.',
  blog_by => 'By the Foodidu team', blog_author => 'Foodidu team', blog_pub => 'Published {date}', blog_upd => 'Updated {date}', blog_toc => 'In this article', blog_codes => 'Codes in this article',
  blog_draft => 'Draft: this article is hidden from Google and not linked from any page until it is published.',
  blog_ended => 'This season ended on {date}. The codes in this article come straight from their pages on Foodidu, and we will update the rest for the next season.',
  wa_title => 'New codes on WhatsApp', wa_text => 'Follow the Foodidu channel on WhatsApp to get new promo codes and deals as soon as we add them.', wa_btn => 'Follow on WhatsApp',
  nocode_item => 'an offer with no code needed ({offer})', b_a1_mixed => '{name} offers on Foodidu: {list}.', b_nst1p_self => 'Open it on your phone or in your browser.',
  b_h1_nocode => '{name} discount', b_how_nocode => 'How to get the {name} discount', b_faq_nocode => '{name} discount: FAQ', b_side_nocode => 'Your {name} discount',
  b_nst1 => 'Open {where}', b_nst1p => 'Use the button on this page or open it yourself.', b_nst2 => 'Order as usual', b_nst2p => 'Add what you want to your cart.',
  b_nst3 => 'The discount applies by itself', b_nst3p => 'No code needed: the discount shows at checkout when your order meets the conditions.',
  b_nq1 => 'Do I need a {name} promo code?', b_na1 => 'No. {offer}: the discount applies by itself on {where}.', b_na1s => 'No. {offer}. {terms}',
  b_nq3 => 'Are there any conditions?', b_nq4 => "Why don't I see the {name} discount?", b_na4 => 'Check that your order meets the conditions and that you are ordering on {where}. Offers are set by {name} and can change or end at any time.',
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
  # Foodidu Business (/business/)
  biz_start => 'Start free', biz_plans_btn => 'See the plans', biz_join => 'Apply now',
  biz_svc_eyebrow => 'Our services', biz_svc_title => 'Tools that grow your restaurant', biz_main_tag => 'Brings customers back',
  biz_journey_eyebrow => 'How the tools work together', biz_plans_eyebrow => 'Plans', biz_plans_title => 'Start free, grow when you are ready',
  biz_plans_sub => 'Pick a plan in the form and our team will get back to you with the details and the right price for your restaurant.', biz_plan_tag => 'Includes loyalty', biz_plan_cta => 'Choose this plan',
  biz_form_title => 'Tell us about your restaurant', biz_feats_title => 'What you get', biz_new => 'New', biz_how_title => 'How we start', biz_other_title => 'More tools for your restaurant',
  biz_cta_title => 'Ready to grow your restaurant?', biz_cta_text => 'Start free with an exclusive promo code for Foodidu users, and add the tools you need when you need them.',
  biz_pill => 'For restaurants and cafés in Egypt', biz_tick1 => 'Start free', biz_tick2 => 'Arabic and English', biz_tick3 => 'Nothing for customers to download',
  biz_more => 'Learn more', biz_nav_plans => 'Plans', biz_nav_services => 'Services', biz_form_text => 'Tell us what your restaurant needs. Our team reviews every request and gets back to you with the next steps.',
  biz_form_t1 => 'No commitment', biz_form_t2 => 'Start with one service', biz_form_t3 => 'Add more whenever you like',
  biz_foot_blurb => 'Tools for restaurants and cafés in Egypt: a QR menu, a loyalty program, an ordering website and visibility on Foodidu.', biz_foot_svc => 'Services', biz_foot_main => 'Promo codes on Foodidu',
  biz_mock_menu => 'Example: a QR menu on a phone', biz_mock_card => 'Example: a digital loyalty card', biz_mock_stand => 'Example: a QR code on a table', biz_mock_web => 'Example: an ordering website', biz_mock_tk => 'Example: a promo code on Foodidu', biz_mock_maps => 'Example: a restaurant on Google Maps',
  qr_nav => 'Free QR code', qr_pill => 'Free tool', qr_link => 'Your menu link or any link', qr_link_hint => 'A website, a PDF on Google Drive, a Facebook or Instagram page, or a WhatsApp number like 01012345678.', biz_search_o => 'QR menu, loyalty, ordering website and Google Maps for restaurants',
  qr_name => 'Restaurant name', qr_name_ph => 'Your restaurant', qr_table => 'Table number', qr_text => 'Text under the code',
  qr_text_def => 'Scan for the menu', qr_style => 'Card style', qr_style_sun => 'Foodidu yellow', qr_style_white => 'Simple white',
  qr_color => 'Code colour', qr_c_brown => 'Brown', qr_c_black => 'Black', qr_c_green => 'Green',
  qr_c_red => 'Red', qr_c_blue => 'Blue', qr_didu => 'Put Didu on the card', qr_credit => 'Write “Foodidu Business” under the card',
  qr_preview => 'Preview', qr_sample_alt => 'Example QR code', qr_sample => 'This is an example. Paste your menu link to make your code.', qr_dl_card => 'Download the card (PNG)',
  qr_dl_code => 'Code only (PNG)', qr_print => 'Print 4 cards', qr_private => 'Your link stays on your device: the code is made in your browser and nothing is sent to us.', qr_how_title => 'How it works',
  qr_tips_title => 'Tips before you print', qr_up_title => 'Want a menu you can change without a new code?', qr_up_text => 'This code always opens the same link. With a Foodidu QR menu you update dishes and prices any time, and the code on your tables stays the same.', qr_up_btn => 'See the QR menu',
  qr_band_title => 'Free: make a QR code for your menu', qr_band_text => 'Paste your menu link and print a table card in seconds, with no sign-up.', qr_band_btn => 'Make my code', qr_js_word => 'MENU',
  qr_js_table => 'Table {n}', qr_js_bad => 'Enter a full link, like https://instagram.com/yourpage', qr_js_long => 'This link is too long for a QR code. Use a shorter link.', qr_js_sample => 'This is an example. Paste your menu link to make your code.',
  qr_js_ready => 'Your code is ready. Scan it with your phone to test it before printing.', qr_js_credit => 'Foodidu Business',
  anim_alt => 'Animation: how Foodidu Business helps a restaurant, from a promo code on Foodidu to a QR menu, online orders, loyalty stamps and real reviews on Google Maps', anim_play => 'Play the animation', anim_pause => 'Pause the animation',
  biz_aud_lead => 'Made for your kind of place:', biz_aud_tools => 'What Foodidu Business gives you', biz_aud_more => 'More from Foodidu Business', biz_all_svc => 'All the services',
  biz_nav_maps => 'Google Maps', foot_biz_wa => 'Restaurants, WhatsApp us:', biz_wa_msg_maps => 'Hi Foodidu Business, I would like to put my restaurant on Google Maps.',
  biz_wa_btn => 'Chat with us on WhatsApp', biz_wa_float => 'Chat with Foodidu Business on WhatsApp',
  biz_wa_msg_info => 'Hi Foodidu Business, I would like to know more about your services for my restaurant.', biz_wa_msg_menu => 'Hi Foodidu Business, I would like an online menu for my restaurant.', biz_wa_msg_qrpro => 'Hi Foodidu Business, I would like QR Premium (EGP 50): a QR card in my restaurant\'s own design (logo and colours).',
  qr_nomenu => 'No menu link yet? <a href="{wa}" target="_blank" rel="noopener" data-track="business_whatsapp_click">Chat with us on WhatsApp</a> and we will make your online menu.',
  p_form_sub => 'Fields marked * are required.', f_services => 'Services you are interested in', f_plan => 'Plan', f_plan_ph => 'Not sure yet',
  f_business => 'Business name', f_contact => 'Contact person', f_contact_hint => 'Arabic or English letters only.', f_phone => 'Phone number', f_email => 'Email address',
  f_location => 'Business location', f_location_ph => 'e.g. Nasr City, Cairo', f_type => 'Business type', f_type_ph => 'Select business type',
  f_restaurant => 'Restaurant', f_cafe => 'Café', f_cloud => 'Cloud kitchen', f_truck => 'Food truck', f_bakery => 'Bakery', f_other => 'Other',
  f_desc => 'Tell us about your business', f_desc_ph => 'Your cuisine, branches and the offer you have in mind', f_web => 'Website or social page (optional)',
  f_submit => 'Send application', f_privacy => 'We only use these details to review your application.',
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
  q5 => 'How can my restaurant appear on Foodidu?', a5 => 'Start free on <a href="{partners}">Foodidu Business</a>: send us an exclusive promo code for Foodidu users and our team will contact you.',
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
  cookie_settings => 'إعدادات ملفات تعريف الارتباط', made => 'صُنع بحب لعشّاق الأكل.', disclaimer => 'أسماء وشعارات العلامات التجارية مملوكة لأصحابها. بصفتنا شريكاً في برنامج أمازون للشركاء، يحصل Foodidu على عمولة من عمليات الشراء المؤهلة.',
  cookie_text => 'نستخدم ملفات تعريف الارتباط لفهم كيفية استخدام Foodidu وتحسينه.', accept => 'موافق', decline => 'رفض', cookies => 'ملفات تعريف الارتباط',
  h_title => 'Foodidu – أكواد وكوبونات خصم في مصر والخليج',
  h_desc => 'أكواد خصم كنتاكي وبيتزا هت ونون ورابيت وبريدفاست وغيرها في مكان واحد وباللغتين. انسخ الكود واعرف الشروط ووفّر على طلبك القادم.',
  h_display => 'كل أكلة<br> <em>بسعر أحلى</em>',
  h_lede => 'انسخ أكواد خصم كنتاكي وبيتزا هت ورابيت ونون وغيرها، مع توضيح الشروط قبل أن تطلب. مجاناً وبدون تسجيل.',
  h_fact_region => 'مصر والخليج', h_fact_free => 'مجاني وبدون تسجيل', h_top => 'اخترناها لك', h_swipe => 'اسحب',
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
  ro_card_save => 'وفّر حتى', ro_more => 'عروض وأكواد مطاعم أخرى', b_all_cat => 'كل أكواد {cat}',
  fo_title => 'أكواد خصم وبرومو كود أول طلب: مطاعم وبقالة وتسوق', fo_h1 => 'أكواد خصم أول طلب',
  fo_desc => '{n} كود خصم لأول طلب من {list} وغيرها. انسخ الكود واستخدمه على أول طلب من حسابك الجديد في مصر أو الخليج.',
  fo_lede => 'كل الأكواد التي تعمل على أول طلب في مكان واحد: {n} من {b}. هي للحسابات الجديدة في كل تطبيق أو موقع.',
  fo_how => 'كيف تستخدم كود أول طلب', fo_s1 => 'أنشئ حساباً جديداً', fo_s1p => 'سجّل في التطبيق أو الموقع. هذه الأكواد عادةً للأرقام والبريد الذي لم يطلب من قبل.',
  fo_s2 => 'أضف طلبك', fo_s2p => 'راجع الشروط تحت الكود: بعض الأكواد تحتاج حداً أدنى لقيمة الطلب.', fo_s3 => 'الصق الكود قبل الدفع', fo_s3p => 'انسخ الكود من هنا والصقه في خانة كود الخصم عند الدفع.',
  fo_q1 => 'ما هو كود خصم أول طلب؟', fo_a1 => 'كود يمنحك خصماً على أول طلب من حسابك في تطبيق أو موقع، ويتوقف عادةً بعد هذا الطلب.',
  fo_q2 => 'هل يمكنني استخدام أكثر من كود أول طلب؟', fo_a2 => 'نعم، كود لكل تطبيق: لكل تطبيق كود أول طلب خاص به. لكن عادةً لا يمكن استخدام كودين في نفس الطلب.',
  fo_q3 => 'لماذا لا يعمل كود أول طلب معي؟', fo_a3 => 'غالباً لأن الحساب أو رقم الهاتف طلب من قبل، أو لأن قيمة الطلب أقل من الحد الأدنى. راجع الشروط تحت كل كود.',
  fo_all => 'كل أكواد خصم أول طلب',
  c_rest_title => 'عروض منيو المطاعم (بدون كود)', c_rest_sub => 'عروض من المنيو الرسمي للمطاعم، مع سعرها في المنيو للمقارنة.',
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
  band_title => 'عندك مطعم أو براند أكل؟', band_text => 'منيو QR، وبرنامج ولاء، وموقع طلبات باسمك، ومطعمك على جوجل ماب، وكود خصمك أمام أشخاص على وشك الطلب. ابدأ مجاناً.', band_btn => 'اكتشف Foodidu Business',
  faq_eyebrow => 'أسئلة شائعة', faq_title => 'عندك سؤال؟',
  c_title => 'كل أكواد الخصم والكوبونات: مطاعم وبقالة وتسوق أونلاين',
  c_desc => 'تصفّح كل أكواد خصم Foodidu في قائمة واحدة: مطاعم مثل كنتاكي وبيتزا هت، وتطبيقات بقالة مثل رابيت وبريدفاست، ونون للتسوق أونلاين.',
  c_h1 => 'كل أكواد الخصم', c_lede => 'كل أكواد Foodidu في مكان واحد: {n} بين المطاعم وتطبيقات البقالة والتسوق أونلاين في مصر والخليج.',
  c_group_restaurants => 'أكواد خصم المطاعم', c_group_groceries => 'أكواد خصم البقالة والسوبر ماركت', c_group_shopping => 'أكواد خصم التسوق أونلاين',
  c_empty => 'لا توجد أكواد تطابق هذا الاختيار.', c_filters => 'تصفية الأكواد',
  nocode => 'بدون كود', nocode_go => 'اطلب', nocode_aria => '{name}: بدون كود، اطلب من {where}',
  nocode_shop => 'تسوّق', nocode_shop_aria => '{name}: بدون كود، تسوّق من {where}',
  pk_h2 => 'اختيارات Foodidu من أمازون', pk_go => 'شاهده على أمازون', pk_eyebrow => 'أمازون مصر', pk_all => 'كل اختيارات أمازون',
  pk_note => 'منتجات اخترناها لك من أمازون مصر. هذه روابط أفلييت: قد يحصل Foodidu على عمولة من عمليات الشراء المؤهلة، بدون أي تكلفة إضافية عليك. الأسعار تتغير على أمازون، فراجع السعر في صفحة المنتج.',
  blog_nav => 'المدونة', blog_h1 => 'مدونة Foodidu', blog_eyebrow => 'من المدونة', blog_all => 'كل المقالات', blog_read => 'اقرأ المقال', blog_title => 'مدونة Foodidu: أدلة التوفير ومواعيد العروض وأكواد الخصم',
  blog_desc => 'أدلة للتوفير في طلبات الأكل والبقالة والتسوق أونلاين في مصر والخليج: مواعيد مواسم التخفيضات، وطريقة عمل أكواد الخصم، والأكواد التي تستخدمها.',
  blog_lede => 'أدلة عملية لتدفع أقل: مواعيد مواسم التخفيضات، وطريقة عمل أكواد الخصم، والأكواد التي نجرّبها بأنفسنا.',
  blog_by => 'بقلم فريق Foodidu', blog_author => 'فريق Foodidu', blog_pub => 'نُشر في {date}', blog_upd => 'آخر تحديث {date}', blog_toc => 'في هذا المقال', blog_codes => 'الأكواد في هذا المقال',
  blog_draft => 'مسودة: هذا المقال مخفي عن جوجل وغير مرتبط بأي صفحة حتى يُنشر.',
  blog_ended => 'انتهى هذا الموسم في {date}. الأكواد في المقال تأتي مباشرة من صفحاتها على Foodidu، وسنحدّث باقي المقال للموسم القادم.',
  wa_title => 'أكواد جديدة على واتساب', wa_text => 'تابع قناة Foodidu على واتساب لتصلك أكواد الخصم والعروض الجديدة أول بأول.', wa_btn => 'تابع القناة على واتساب',
  nocode_item => 'عرض بدون كود ({offer})', b_a1_mixed => 'عروض {name} على Foodidu: {list}.', b_nst1p_self => 'افتحه بنفسك من هاتفك أو من المتصفح.',
  b_h1_nocode => 'عرض خصم {name}', b_how_nocode => 'طريقة الحصول على خصم {name}', b_faq_nocode => 'أسئلة عن خصم {name}', b_side_nocode => 'خصم {name}',
  b_nst1 => 'افتح {where}', b_nst1p => 'من الزر في هذه الصفحة أو بنفسك.', b_nst2 => 'اطلب كالمعتاد', b_nst2p => 'أضف ما تريده إلى السلة.',
  b_nst3 => 'الخصم يُطبَّق تلقائياً', b_nst3p => 'لا تحتاج إلى كود: يظهر الخصم عند الدفع إذا كان طلبك مطابقاً للشروط.',
  b_nq1 => 'هل أحتاج كود خصم {name}؟', b_na1 => 'لا. {offer}، والخصم يُطبَّق تلقائياً على {where}.', b_na1s => 'لا. {offer}. {terms}',
  b_nq3 => 'هل للعرض شروط؟', b_nq4 => 'لماذا لا يظهر خصم {name}؟', b_na4 => 'تأكد أن طلبك يطابق الشروط وأنك تطلب من {where}. العروض تحددها {name} وقد تتغير أو تنتهي في أي وقت.',
  b_h1 => 'كود خصم {name}', b_f_region => 'متاح في', b_f_where => 'استخدمه على', b_f_checked => 'تحقّق منه Foodidu', b_f_cost => 'على Foodidu', b_go => 'اذهب إلى {name}',
  b_how => 'طريقة استخدام كود {name}', b_st1 => 'انسخ الكود', b_st1p => 'اضغط على «انسخ الكود» لنسخ {code}.',
  b_st2 => 'افتح {where}', b_st2p => 'وأضف ما تريده إلى السلة كالمعتاد.',
  b_st3 => 'الصقه عند الدفع', b_st3p => 'الصق الكود في خانة كود الخصم (البرومو كود أو الكوبون)، وسيُطبَّق الخصم إذا كان طلبك مطابقاً للشروط.',
  b_about => 'عن {name}', b_faq => 'أسئلة عن كود {name}',
  b_q1 => 'ما هو كود خصم {name}؟', b_a1 => 'كود {name} على Foodidu هو {code}، ويمنحك: {offer}.',
  b_q2 => 'كيف أستخدم كود خصم {name}؟', b_a2 => 'انسخ الكود {code}، وافتح {where}، وأضف طلبك إلى السلة، ثم الصق الكود في خانة كود الخصم أو البرومو كود عند الدفع.',
  b_q3 => 'هل للكود شروط؟', b_q4 => 'لماذا لا يعمل كود {name}؟',
  b_a4 => 'تأكد أن طلبك يطابق الشروط (مثل أن يكون أول طلب أو بحد أدنى للقيمة) وأنك كتبت الكود تماماً كما هو. العروض تحددها {name} وقد تتغير أو تنتهي في أي وقت، وإذا لم ينجح الكود جرّب كوداً آخر على Foodidu.',
  b_note => 'العروض تحددها {name} وقد تتغير أو تنتهي دون إشعار. أسماء وشعارات العلامات التجارية مملوكة لأصحابها.',
  b_side_code => 'كود {name}', b_side_cats => 'تصفّح حسب الفئة', b_related => 'المزيد من أكواد {cat}', b_terms => 'الشروط',
  b_h1_multi => 'أكواد خصم {name}', b_side_codes => 'أكواد {name}', b_st1p_multi => 'اضغط «انسخ الكود» بجانب الكود الذي تريد استخدامه.',
  b_a1_multi => 'أكواد {name} على Foodidu: {list}.', checked_short => 'تم التحقق في {date}', h_fact_checked => 'تم التحقق {date}', h_fact_checked_n => '{n} كود اتحقق منه في {date}',
  cat_def_restaurants => 'المطاعم', cat_def_groceries => 'البقالة', cat_def_shopping => 'التسوق أونلاين',
  biz_start => 'ابدأ مجاناً', biz_plans_btn => 'شوف الباقات', biz_join => 'قدّم دلوقتي',
  biz_svc_eyebrow => 'خدماتنا', biz_svc_title => 'أدوات تكبّر مطعمك', biz_main_tag => 'يرجّع عملاءك',
  biz_journey_eyebrow => 'إزاي الأدوات بتكمّل بعض', biz_plans_eyebrow => 'الباقات', biz_plans_title => 'ابدأ مجاناً، وكبّر لما تكون جاهز',
  biz_plans_sub => 'اختار الباقة في الفورم، وفريقنا يتواصل معاك بالتفاصيل والسعر المناسب لمطعمك.', biz_plan_tag => 'فيها برنامج الولاء', biz_plan_cta => 'اختار الباقة دي',
  biz_form_title => 'احكيلنا عن مطعمك', biz_feats_title => 'هتاخد إيه', biz_new => 'جديد', biz_how_title => 'إزاي بنبدأ', biz_other_title => 'أدوات تانية لمطعمك',
  biz_cta_title => 'جاهز تكبّر مطعمك؟', biz_cta_text => 'ابدأ مجاناً بكود خصم حصري لعملاء Foodidu، وزوّد الأدوات اللي محتاجها وقت ما تحتاجها.',
  biz_pill => 'للمطاعم والكافيهات في مصر', biz_tick1 => 'ابدأ مجاناً', biz_tick2 => 'بالعربي والإنجليزي', biz_tick3 => 'من غير تطبيق للعميل',
  biz_more => 'اعرف أكتر', biz_nav_plans => 'الباقات', biz_nav_services => 'الخدمات', biz_form_text => 'قولّنا مطعمك محتاج إيه. فريقنا بيراجع كل طلب ويرجعلك بالخطوات الجاية.',
  biz_form_t1 => 'من غير أي التزام', biz_form_t2 => 'ابدأ بخدمة واحدة', biz_form_t3 => 'وزوّد الباقي وقت ما تحب',
  biz_foot_blurb => 'أدوات للمطاعم والكافيهات في مصر: منيو QR، وبرنامج ولاء، وموقع طلبات، وظهور على Foodidu.', biz_foot_svc => 'الخدمات', biz_foot_main => 'أكواد الخصم على Foodidu',
  biz_mock_menu => 'مثال: منيو QR على الموبايل', biz_mock_card => 'مثال: كارت ولاء إلكتروني', biz_mock_stand => 'مثال: كود QR على الترابيزة', biz_mock_web => 'مثال: موقع طلبات', biz_mock_tk => 'مثال: كود خصم على Foodidu', biz_mock_maps => 'مثال: مطعم على جوجل ماب',
  qr_nav => 'كود QR مجاني', qr_pill => 'أداة مجانية', qr_link => 'لينك المنيو أو أي لينك', qr_link_hint => 'موقع، أو ملف PDF على Google Drive، أو صفحة فيسبوك أو إنستجرام، أو رقم واتساب زي 01012345678.', biz_search_o => 'منيو QR وولاء وموقع طلبات وجوجل ماب للمطاعم',
  qr_name => 'اسم المطعم', qr_name_ph => 'مطعمك', qr_table => 'رقم الترابيزة', qr_text => 'الجملة اللي تحت الكود',
  qr_text_def => 'امسح الكود وشوف المنيو', qr_style => 'شكل الكارت', qr_style_sun => 'أصفر Foodidu', qr_style_white => 'أبيض بسيط',
  qr_color => 'لون الكود', qr_c_brown => 'بني', qr_c_black => 'أسود', qr_c_green => 'أخضر',
  qr_c_red => 'أحمر', qr_c_blue => 'أزرق', qr_didu => 'حط Didu على الكارت', qr_credit => 'اكتب «Foodidu Business» تحت الكارت',
  qr_preview => 'المعاينة', qr_sample_alt => 'مثال لكود QR', qr_sample => 'ده مثال. حط لينك المنيو بتاعك عشان يتعمل كودك.', qr_dl_card => 'نزّل الكارت (PNG)',
  qr_dl_code => 'الكود بس (PNG)', qr_print => 'اطبع 4 كروت', qr_private => 'اللينك بتاعك بيفضل على جهازك: الكود بيتعمل في المتصفح ومبيتبعتلناش أي حاجة.', qr_how_title => 'إزاي تستخدمها',
  qr_tips_title => 'نصايح قبل الطباعة', qr_up_title => 'عايز منيو تعدّله من غير ما تغيّر الكود؟', qr_up_text => 'الكود ده بيفتح نفس اللينك على طول. مع منيو QR من Foodidu تعدّل الأصناف والأسعار في أي وقت، والكود اللي على الترابيزات يفضل زي ما هو.', qr_up_btn => 'شوف منيو QR',
  qr_band_title => 'مجاناً: اعمل كود QR لمنيو مطعمك', qr_band_text => 'حط لينك المنيو واطبع كارت الترابيزة في ثواني، من غير تسجيل.', qr_band_btn => 'اعمل الكود بتاعي', qr_js_word => 'منيو',
  qr_js_table => 'ترابيزة {n}', qr_js_bad => 'اكتب لينك كامل، زي https://instagram.com/yourpage', qr_js_long => 'اللينك ده طويل على الكود. استخدم لينك أقصر.', qr_js_sample => 'ده مثال. حط لينك المنيو بتاعك عشان يتعمل كودك.',
  qr_js_ready => 'كودك جاهز. امسحه بموبايلك وجرّبه قبل الطباعة.', qr_js_credit => 'Foodidu Business',
  anim_alt => 'أنيميشن: إزاي Foodidu Business بيساعد المطعم، من كود خصم على Foodidu لمنيو QR وطلبات أونلاين وأختام ولاء وتقييمات حقيقية على جوجل ماب', anim_play => 'شغّل الأنيميشن', anim_pause => 'وقّف الأنيميشن',
  biz_aud_lead => 'حسب نوع مكانك:', biz_aud_tools => 'Foodidu Business هيقدّملك إيه', biz_aud_more => 'كمان من Foodidu Business', biz_all_svc => 'كل الخدمات',
  biz_nav_maps => 'جوجل ماب', foot_biz_wa => 'للمطاعم، كلمنا واتساب:', biz_wa_msg_maps => 'أهلاً Foodidu Business، عايز أضيف مطعمي على جوجل ماب.',
  biz_wa_btn => 'كلمنا على واتساب', biz_wa_float => 'كلّم Foodidu Business على واتساب',
  biz_wa_msg_info => 'أهلاً Foodidu Business، عايز أعرف أكتر عن خدماتكم لمطعمي.', biz_wa_msg_menu => 'أهلاً Foodidu Business، عايز منيو إلكتروني لمطعمي.', biz_wa_msg_qrpro => 'أهلاً Foodidu Business، عايز QR Premium بـ 50 جنيه: كارت QR بتصميم خاص بمطعمي (لوجو وألوان).',
  qr_nomenu => 'معندكش لينك للمنيو؟ <a href="{wa}" target="_blank" rel="noopener" data-track="business_whatsapp_click">كلمنا واتساب</a> ونعملّك منيو إلكتروني.',
  p_form_sub => 'الحقول المميزة بـ * مطلوبة.', f_services => 'الخدمات اللي تهمك', f_plan => 'الباقة', f_plan_ph => 'لسه مش متأكد',
  f_business => 'اسم النشاط', f_contact => 'اسم المسؤول', f_contact_hint => 'حروف عربية أو إنجليزية فقط.', f_phone => 'رقم الهاتف', f_email => 'البريد الإلكتروني',
  f_location => 'موقع النشاط', f_location_ph => 'مثال: مدينة نصر، القاهرة', f_type => 'نوع النشاط', f_type_ph => 'اختر نوع النشاط',
  f_restaurant => 'مطعم', f_cafe => 'كافيه', f_cloud => 'مطبخ سحابي', f_truck => 'عربة طعام', f_bakery => 'مخبز', f_other => 'أخرى',
  f_desc => 'أخبرنا عن نشاطك', f_desc_ph => 'نوع الأكل والفروع والعرض الذي تفكر فيه', f_web => 'الموقع الإلكتروني أو صفحة السوشيال (اختياري)',
  f_submit => 'أرسل الطلب', f_privacy => 'نستخدم هذه البيانات لمراجعة طلبك فقط.',
  pr_seo => 'سياسة الخصوصية في Foodidu: كيف نستخدم بياناتك',
  pr_title => 'سياسة الخصوصية', pr_desc => 'تعرّف على كيفية جمع Foodidu لمعلوماتك واستخدامها وحمايتها، والخدمات التي نستخدمها، وخياراتك بشأن ملفات تعريف الارتباط وبياناتك.',
  te_seo => 'الشروط والأحكام لاستخدام موقع Foodidu',
  te_title => 'الشروط والأحكام', te_desc => 'الشروط التي تنطبق عند استخدامك Foodidu وأكواد الخصم، بما في ذلك توفّر الأكواد ودقتها ومسؤولياتك كمستخدم.',
  updated => 'آخر تحديث: {date}',
  q1 => 'ما هو Foodidu؟', a1 => 'Foodidu (فوديدو) موقع مجاني يجمع أكواد وكوبونات الخصم للمطاعم وتطبيقات البقالة والتسوق أونلاين في مصر والخليج، باللغتين العربية والإنجليزية.',
  q2 => 'هل Foodidu مجاني؟', a2 => 'نعم، لا تحتاج إلى حساب. انسخ أي كود واستخدمه مباشرة في تطبيق أو موقع العلامة التجارية.',
  q3 => 'كيف أستخدم كود الخصم؟', a3 => 'اضغط «انسخ» على الكود، وافتح تطبيق أو موقع العلامة التجارية، وأضف طلبك إلى السلة، ثم الصق الكود في خانة كود الخصم أو البرومو كود عند الدفع.',
  q4 => 'لماذا لم يعمل الكود؟', a4 => 'معظم الأكواد لها شروط مثل أول طلب فقط أو حد أدنى لقيمة الطلب، ويمكن للعلامات التجارية تغيير العروض أو إنهاؤها في أي وقت. راجع الشروط في صفحة الكود وتأكد أنك كتبته كما هو تماماً.',
  q5 => 'كيف يظهر مطعمي على Foodidu؟', a5 => 'ابدأ مجاناً عبر <a href="{partners}">Foodidu Business</a>: أرسل لنا كود خصم حصرياً لعملاء Foodidu وسيتواصل معك فريقنا.',
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
sub url_enc { my $s = shift; utf8::encode($s); $s =~ s/([^A-Za-z0-9\-_.~])/sprintf('%%%02X', ord $1)/ge; $s }
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
  pause    => '<path d="M8 5v14M16 5v14"/>',
  download => '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  print    => '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  qr       => '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h3v3h-3zM21 14v.01M14 21h.01M17.5 21H21v-3.5"/>',
  pk_coffee => '<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z"/><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3c-.7 1.1.7 1.9 0 3M12 3c-.7 1.1.7 1.9 0 3"/><path d="M3 22h14"/>',
  pk_milk   => '<path d="M8 2h8v3l2 3.5V21a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V8.5L8 5V2Z"/><path d="M6 8.5h12M8 5h8"/><path d="M9.5 15c1.6-1.3 3.4-1.3 5 0"/>',
  pk_rice   => '<path d="M3 12h18a9 9 0 0 1-18 0Z"/><path d="M6.5 12c0-3 2.4-5 5.5-5s5.5 2 5.5 5"/><path d="M10 9.5v.01M13 8.8v.01M15 10.3v.01M8.8 11v.01"/>',
  pk_oil    => '<path d="M10 2h4v3l2 3v12a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V8l2-3V2Z"/><path d="M8 10.5h8"/><path d="M12 13c-1.1 1.4-1.7 2.2-1.7 3a1.7 1.7 0 0 0 3.4 0c0-.8-.6-1.6-1.7-3Z"/>',
  pk_flour  => '<path d="M7 4h10l-1.5 3.2C17.7 9 19 12 19 15.5A5.5 5.5 0 0 1 13.5 21h-3A5.5 5.5 0 0 1 5 15.5C5 12 6.3 9 8.5 7.2L7 4Z"/><path d="M8.5 7.2h7"/><path d="M12 18v-6"/><path d="M12 14.5c-1.6 0-2.6-1-2.6-2.6 1.6 0 2.6 1 2.6 2.6Zm0 0c1.6 0 2.6-1 2.6-2.6-1.6 0-2.6 1-2.6 2.6Z"/>',
  pk_drop   => '<path d="M12 3c-3.6 4.3-6 7.6-6 10.6a6 6 0 0 0 12 0C18 10.6 15.6 7.3 12 3Z"/><path d="M9.3 14.2A2.7 2.7 0 0 0 12 16.9"/>',
  pk_roll   => '<ellipse cx="6.5" cy="12" rx="3" ry="6.5"/><path d="M6.5 5.5H18a3 6.5 0 0 1 0 13H6.5"/><circle cx="6.5" cy="12" r="1"/>',
  pk_bottle => '<path d="M10 2h4v2.5a3 3 0 0 1 2 2.8V20a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V7.3a3 3 0 0 1 2-2.8V2Z"/><path d="M8 11h8M8 16h8"/>',
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
  whatsapp => '<path d="M3.5 20.5 4.8 16.3A8.5 8.5 0 1 1 8 19.6Z"/><path fill="currentColor" stroke="none" d="M9.1 7.6c.3 0 .5.1.6.4l.8 1.8c.1.3 0 .6-.2.8l-.6.6c.6 1.3 1.6 2.3 2.9 2.9l.6-.6c.2-.2.5-.3.8-.2l1.8.8c.3.1.4.3.4.6v.4c0 1-1 1.9-2 1.8-3.6-.4-6.5-3.3-6.9-6.9-.1-1 .8-2 1.8-2Z"/>',
  linkedin => '<path fill="currentColor" stroke="none" d="M4 9h4v12H4zM6 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm4 6h3.8v1.7c.6-1 1.9-2 3.9-2 4 0 4.3 2.6 4.3 6V21h-4v-5.5c0-1.5 0-3.3-2-3.3s-2.3 1.5-2.3 3.2V21H10z"/>',
);
# An icon points at its <symbol>; layout() puts each page's symbols in once (a page was carrying the same paths dozens of times)
sub icon { my ($n, $cls) = @_; die "unknown icon \"$n\"
" unless $ICON{$n}; $cls = $cls ? " $cls" : ''; qq{<svg class="icon$cls" viewBox="0 0 24 24" aria-hidden="true"><use href="#ic-$n"/></svg>} }   # stroke and fill come from .icon in site.css

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
# Logo tiles are 384 px; a 192 px copy (name-192.webp, made by tools/assets.html and the dashboard) covers the small tiles.
sub small_logo { my $f = shift; (my $s = $f) =~ s/\.(\w+)$/-192.$1/; -f "$ROOT/static/img/brands/$s" ? $s : undef }
sub logo_src { my $f = $_[0]{logo}; '/img/brands/' . (small_logo($f) // $f) }   # small copy: search results, 44-64 px tiles
sub logo_attrs {   # src + srcset for a logo shown at $size CSS px
  my ($f, $size) = @_;
  my $s = small_logo($f) or return qq{src="/img/brands/$f"};
  qq{src="/img/brands/$s" srcset="/img/brands/$s 192w, /img/brands/$f 384w" sizes="${size}px"};
}

# ------------------------------------------------------------------ components
sub code_btn {
  my ($b, $l, $lg) = @_;
  return qq{<span class="code-btn nocode static} . ($lg ? ' lg' : '') . '"><span class="code">' . T($l, 'nocode') . '</span></span>' if $b->{noCode} && !$b->{url};
  my ($go, $aria) = $b->{category} eq 'shopping' ? ('nocode_shop', 'nocode_shop_aria') : ('nocode_go', 'nocode_aria');   # "Shop" for stores like Amazon, "Order" for food
  return qq{<a class="code-btn nocode} . ($lg ? ' lg' : '') . qq{" href="} . esc($b->{url}) . qq{" rel="nofollow sponsored noopener" target="_blank" data-track="brand_link_click" data-brand="$b->{key}" aria-label="}
    . Te($l, $aria, name => $b->{name}{$l}, where => $b->{where}{$l}) . '"><span class="code">' . T($l, 'nocode') . '</span><span class="act">' . icon('external') . '<span class="act-label">' . T($l, $go) . '</span></span></a>' if $b->{noCode};
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
sub logo_img  { my ($b, $l, $size, $eager) = @_; qq{<img } . logo_attrs($b->{logo}, $size) . qq{ alt="} . Te($l, 'logo_alt', name => $b->{name}{$l}) . qq{" width="$size" height="$size"} . ($eager ? ' fetchpriority="high"' : ' loading="lazy"') . qq{ decoding="async">} }

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
sub band {   # the restaurants band; $wa: + a WhatsApp button (home page only)
  my ($l, $wa) = @_;
  qq{<section class="wrap section-tight"><div class="band"><div><h2>} . T($l, 'band_title') . '</h2><p>' . T($l, 'band_text') . qq{</p><a class="btn btn-sun" href="} . path_for($l, '/business/') . '">' . T($l, 'band_btn') . ' ' . icon('arrow', 'flip') . '</a>' . ($wa ? biz_wa_link($l, 'info', 'btn btn-leaf band-wa', T($l, 'biz_wa_btn')) : '') . qq{</div><img class="face" src="$LOGO" alt="" width="200" height="79" loading="lazy"></div></section>};
}
# Follow the WhatsApp channel: a card in the brand page sidebar ($side), or a strip above the partner band
sub wa_cta {
  my ($l, $side) = @_;
  return '' unless $WA;
  my $a = qq{<a class="btn btn-leaf" href="$WA" rel="noopener" target="_blank" data-track="whatsapp_channel_click">} . icon('whatsapp') . ' ' . T($l, 'wa_btn') . '</a>';
  my $didu = '<img class="didu" src="/img/mascot/didu.svg" alt="" width="88" height="88" loading="lazy">';
  return '<div class="side-card wa-cta side-wa">' . $didu . '<h2>' . T($l, 'wa_title') . '</h2><p>' . T($l, 'wa_text') . "</p>$a</div>" if $side;
  '<section class="wrap section-tight"><div class="wa-cta">' . $didu . '<div class="wa-text"><h2>' . T($l, 'wa_title') . '</h2><p>' . T($l, 'wa_text') . "</p></div>$a</div></section>";
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
# ------------------------------------------------------------------ Foodidu Business look (skin 'biz', static/css/biz.css)
# Example pictures of each service, drawn in HTML/CSS (no stock photos): a QR menu on a phone, a loyalty card,
# a QR code on a table (a real code that opens /business/, made by tools/qr.js), an ordering website and a code on Foodidu.
my %BZM = (
  en => { rest => 'Your restaurant', open => 'Open now', offer => 'Today: a free drink with any meal', cats => ['All', 'Burgers', 'Pizza', 'Drinks'],
    items => [['burger', 'Classic burger', 'Beef, cheddar, house sauce', 145], ['pizza', 'Margherita pizza', 'Tomato, mozzarella, basil', 180], ['drink', 'Mint lemonade', 'Fresh, lightly sweet', 55], ['cake', 'Cheesecake', 'Strawberry or Lotus', 90]],
    word => 'MENU', cur => 'EGP {n}', card => 'Loyalty card', left => '3 more stamps to a free drink', pts => '320 points', stamp => '+1 stamp', table => 'Table 7', scan => 'Scan for the menu',
    url => 'yourrestaurant.com', web_h => 'Hot and fresh, straight to your door', del => 'Delivery', pick => 'Pickup', order => 'Order online',
    place => 'Restaurant · Open now', dir => 'Directions', call => 'Call', menu2 => 'Menu', real => 'Real reviews', review => 'Great food and fast service!',
    tk_on => 'Now on Foodidu', tk_offer => '20% off your first order', tk_code => 'YOUR CODE', tk_copy => 'Copy code', search => 'your restaurant promo code', group => 'Group order (3)', up_q => 'Add fries + a drink?', up_p => '+ EGP 15', up_btn => 'Add' },
  ar => { rest => 'مطعمك', open => 'مفتوح دلوقتي', offer => 'النهارده: مشروب ببلاش مع أي وجبة', cats => ['الكل', 'برجر', 'بيتزا', 'مشروبات'],
    items => [['burger', 'برجر كلاسيك', 'لحم، شيدر، صوص البيت', 145], ['pizza', 'بيتزا مارجريتا', 'طماطم، موتزاريلا، ريحان', 180], ['drink', 'ليمون نعناع', 'فريش وسكره خفيف', 55], ['cake', 'تشيز كيك', 'فراولة أو لوتس', 90]],
    word => 'منيو', cur => '{n} ج.م', card => 'كارت الولاء', left => 'باقي 3 أختام على مشروب ببلاش', pts => '320 نقطة', stamp => '+1 ختم', table => 'ترابيزة 7', scan => 'امسح الكود وشوف المنيو',
    url => 'yourrestaurant.com', web_h => 'سخن وطازة لحد باب بيتك', del => 'توصيل', pick => 'استلام', order => 'اطلب أونلاين',
    place => 'مطعم · مفتوح دلوقتي', dir => 'الاتجاهات', call => 'اتصال', menu2 => 'المنيو', real => 'تقييمات حقيقية', review => 'الأكل جميل والخدمة سريعة!',
    tk_on => 'دلوقتي على Foodidu', tk_offer => 'خصم 20% على أول طلب', tk_code => 'كودك هنا', tk_copy => 'انسخ الكود', search => 'كود خصم مطعمك', group => 'طلب جماعي (٣)', up_q => 'تضيف بطاطس ومشروب؟', up_p => '+15 ج.م', up_btn => 'أضف' },
);
my %FOOD = (
  burger => '<path d="M4 11c0-3.3 3.6-6 8-6s8 2.7 8 6Z"/><path d="M3 14h18"/><path d="M4 17h16v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1Z"/>',
  pizza  => '<path d="M3 6c5.5-3 12.5-3 18 0L12 21Z"/><path d="M4.6 9.2c4.6-2 10.2-2 14.8 0"/><circle cx="10" cy="12" r="1"/><circle cx="14" cy="14.5" r="1"/>',
  drink  => '<path d="M6 7h12l-1.5 13a1 1 0 0 1-1 .9h-7a1 1 0 0 1-1-.9Z"/><path d="m12 7 2-5h3"/><path d="M6.5 11h11"/>',
  cake   => '<path d="M4 20h16v-7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2Z"/><path d="M4 15c2 1.3 4 1.3 6 0s4-1.3 6 0 3 1.3 4 0"/><path d="M12 11V7.5"/><path d="M12 3.8c-.7.9-.7 1.8 0 2.7.7-.9.7-1.8 0-2.7Z"/>',
);
sub food_ic { qq{<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">$FOOD{$_[0]}</svg>} }
sub biz_mock {
  my ($l, $k) = @_;
  my $m = $BZM{$l};
  my $price = sub { (my $s = $m->{cur}) =~ s/\{n\}/$_[0]/; $s };
  my $th = sub { qq{<span class="m-th m-$_[0]">} . food_ic($_[0]) . '</span>' };
  my %html = (
    phone => sub {
      '<div class="m-phone"><div class="m-screen"><div class="m-top"><span class="m-logo">' . icon('fork') . "</span><div><b>$m->{rest}</b><small><i></i>$m->{open}</small></div><span class=\"m-group\">" . icon('basket') . "$m->{group}</span></div>"
      . '<p class="m-offer">' . icon('gift') . "<span>$m->{offer}</span></p>"
      . '<div class="m-chips">' . join('', map { '<span' . ($_ == 0 ? ' class="on"' : '') . ">$m->{cats}[$_]</span>" } 0 .. 3) . '</div>'
      . '<ul class="m-items">' . join('', map { '<li>' . $th->($_->[0]) . "<div><b>$_->[1]</b><small>$_->[2]</small></div><em>" . $price->($_->[3]) . '</em></li>'
          . ($_ == $m->{items}[0] ? '<li class="m-up">' . icon('plus') . "<div><b>$m->{up_q}</b><small>$m->{up_p}</small></div><span>$m->{up_btn}</span></li>" : '') } @{ $m->{items} }[0 .. 2]) . '</ul></div></div>';
    },
    card => sub {
      "<div class=\"m-card\"><div class=\"m-card-top\"><span>$m->{card}</span><b>$m->{rest}</b></div><ol class=\"m-stamps\">"
      . join('', map { $_ <= 7 ? '<li class="on">' . icon('check') . '</li>' : $_ == 10 ? '<li class="gift">' . icon('gift') . '</li>' : '<li></li>' } 1 .. 10)
      . "</ol><div class=\"m-card-foot\"><span>$m->{left}</span><b>$m->{pts}</b></div><span class=\"m-chip\">$m->{stamp}</span></div>";
    },
    stand => sub {
      "<div class=\"m-stand\"><div class=\"m-tent\"><span class=\"m-tent-side\">$m->{word}</span><div><small>$m->{table}</small><div class=\"m-qr\"><img src=\"/img/biz/qr-$l.svg\" alt=\"\" width=\"132\" height=\"132\" loading=\"lazy\"><i></i><i></i><i></i><i></i></div>"
      . "<b>$m->{scan}</b><span class=\"m-tent-name\">$m->{rest}</span></div><img class=\"m-tent-didu\" src=\"/img/mascot/didu.svg\" alt=\"\" width=\"58\" height=\"58\" loading=\"lazy\"></div></div>";
    },
    web => sub {
      "<div class=\"m-browser\"><div class=\"m-bar\"><i></i><i></i><i></i><span>$m->{url}</span></div><div class=\"m-page\"><div class=\"m-hero\"><span class=\"m-logo\">" . icon('fork') . "</span><b>$m->{web_h}</b>"
      . "<div class=\"m-toggle\"><span class=\"on\">$m->{del}</span><span>$m->{pick}</span></div><span class=\"m-btn\">$m->{order}</span></div>"
      . '<ul class="m-tiles">' . join('', map { '<li>' . $th->($_->[0]) . "<b>$_->[1]</b><em>" . $price->($_->[3]) . '</em><i>+</i></li>' } @{ $m->{items} }[0 .. 2]) . '</ul></div></div>';
    },
    maps => sub {   # the restaurant on a map, its rating and a review from a customer
      '<div class="m-maps"><div class="m-map"><i class="r1"></i><i class="r2"></i><i class="r3"></i><span class="m-pin">' . icon('pin') . '</span></div>'
      . "<div class=\"m-place\"><b>$m->{rest}</b><div class=\"m-stars\"><span>★★★★★</span><small>$m->{real}</small></div><small>$m->{place}</small>"
      . "<div class=\"m-actions\"><span>$m->{dir}</span><span>$m->{call}</span><span>$m->{menu2}</span></div></div>"
      . '<div class="m-review"><span class="m-avatar">' . icon('fork') . "</span><div><span>★★★★★</span><p>$m->{review}</p></div></div></div>";
    },
    ticket => sub {   # the restaurant's code on Foodidu, found from a Google search
      '<div class="m-serp"><div class="m-search">' . icon('search') . "<span>$m->{search}</span></div><div class=\"m-ticket\"><div class=\"m-tk-l\"><span class=\"m-logo\">" . icon('fork') . "</span><div><small>$m->{tk_on}</small><b>$m->{tk_offer}</b></div></div>"
      . "<div class=\"m-tk-r\"><code>$m->{tk_code}</code><span class=\"m-btn\">$m->{tk_copy}</span></div></div></div>";
    },
  );
  my %label = (maps => 'biz_mock_maps', phone => 'biz_mock_menu', card => 'biz_mock_card', stand => 'biz_mock_stand', web => 'biz_mock_web', ticket => 'biz_mock_tk');
  qq{<figure class="mock mock-$k" role="img" aria-label="} . T($l, $label{$k}) . qq{"><div aria-hidden="true">} . $html{$k}->() . '</div></figure>';
}
# A WhatsApp chat with Foodidu Business, with a ready message ('info' or 'menu'); '' when no number is set
sub biz_wa { my ($l, $what) = @_; my $n = $BIZ && $BIZ->{whatsapp} ? $BIZ->{whatsapp}{number} : ''; $n ? "https://wa.me/$n?text=" . url_enc(T($l, "biz_wa_msg_$what")) : '' }
sub biz_wa_link { my ($l, $what, $cls, $label) = @_; my $u = biz_wa($l, $what) or return ''; qq{<a class="$cls" href="$u" target="_blank" rel="noopener" data-track="business_whatsapp_click">} . icon('whatsapp') . "<span>$label</span></a>" }
# Foodidu Business as an organisation in the JSON-LD of every business page; "gbp" in data/business.json is its Google
# Business Profile link, added to sameAs once the profile is verified.
sub biz_org {
  my $gbp = ($BIZ->{org} // {})->{gbp};
  { '@type' => 'Organization', '@id' => "$SITE/business/#org", name => 'Foodidu Business', url => "$SITE/business/", parentOrganization => { '@id' => "$SITE/#org" },
    logo => { '@type' => 'ImageObject', url => "$SITE/img/biz/logo.png", width => 720, height => 720 }, areaServed => { '@type' => 'Country', name => 'Egypt' },
    ($BIZ->{whatsapp} ? (contactPoint => { '@type' => 'ContactPoint', telephone => "+$BIZ->{whatsapp}{number}", contactType => 'sales', availableLanguage => ['Arabic', 'English'] }) : ()),
    ($gbp ? (sameAs => [$gbp]) : ()) }
}
# Header and footer of the Foodidu Business pages (they replace the Foodidu ones in layout())
sub biz_chrome {
  my ($l, $key, $lang_link) = @_;
  my $b = path_for($l, '/business/');
  my @svc = grep { $_->{page} // 1 } @{ $BIZ->{services} };
  my $maps = grep { $_->{key} eq 'google-maps' } @svc;
  my $svc_page = $key =~ m{^/business/[^/]+/$} && $key ne '/business/qr-menu-generator/' && !($maps && $key eq '/business/google-maps/');
  my $nav = qq{<a class="nav-desk" href="$b#services"} . ($svc_page ? ' aria-current="page"' : '') . '><span class="nav-ic">' . icon('store') . '</span><span>' . T($l, 'biz_nav_services') . '</span>' . icon('arrow', 'nav-go flip') . '</a>'
    . ($maps ? '<a class="nav-desk" href="' . path_for($l, '/business/google-maps/') . '"' . ($key eq '/business/google-maps/' ? ' aria-current="page"' : '') . '><span class="nav-ic">' . icon('pin') . '</span><span>' . T($l, 'biz_nav_maps') . '</span>' . icon('arrow', 'nav-go flip') . '</a>' : '')
    . join('', map { my $p = "/business/$_->{key}/"; '<a class="nav-svc" href="' . path_for($l, $p) . '"' . ($key eq $p ? ' aria-current="page"' : '') . '><span class="nav-ic">' . icon($_->{icon}) . '</span><span>' . esc($_->{name}{$l}) . '</span>' . icon('arrow', 'nav-go flip') . '</a>' } @svc)
    . ($BIZ->{tool} ? '<a href="' . path_for($l, '/business/qr-menu-generator/') . '"' . ($key eq '/business/qr-menu-generator/' ? ' aria-current="page"' : '') . '><span class="nav-ic">' . icon('qr') . '</span><span>' . T($l, 'qr_nav') . '</span>' . icon('arrow', 'nav-go flip') . '</a>' : '')
    . qq{<a href="$b#plans"><span class="nav-ic">} . icon('tag') . '</span><span>' . T($l, 'biz_nav_plans') . '</span>' . icon('arrow', 'nav-go flip') . '</a>'
    . qq{<div class="nav-extra"><a class="bz-btn bz-pri" href="$b#join">} . T($l, 'biz_start') . ' ' . icon('arrow', 'flip') . '</a>' . biz_wa_link($l, 'info', 'bz-btn bz-wa', T($l, 'biz_wa_btn')) . '</div>';
  my $logo = qq{<a class="bz-logo" href="$b" aria-label="Foodidu Business"><img src="$LOGO" alt="Foodidu" width="106" height="42"><span>Business</span></a>};
  my $header = qq{<header class="site-header bz-header"><div class="wrap header-in">$logo<nav class="nav" id="site-nav" aria-label="Foodidu Business">$nav</nav><div class="nav-backdrop" data-nav-close hidden></div>$lang_link}
    . ($BIZ->{whatsapp} ? '<a class="bz-head-wa" href="' . biz_wa($l, 'info') . '" target="_blank" rel="noopener" data-track="business_whatsapp_click" aria-label="' . T($l, 'biz_wa_float') . '">' . icon('whatsapp') . '<bdi dir="ltr">' . esc($BIZ->{whatsapp}{display}) . '</bdi></a>' : '')
    . qq{<a class="bz-btn bz-pri bz-head-cta" href="$b#join">} . T($l, 'biz_start') . '</a>'
    . '<button class="menu-btn" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="' . T($l, 'menu') . '">' . icon('menu', 'i-menu') . icon('close', 'i-close') . '</button></div></header>';
  my $wa = $BIZ->{whatsapp} ? biz_wa_link($l, 'info', 'bz-foot-wa', T($l, 'biz_wa_btn') . ': <bdi dir="ltr">' . esc($BIZ->{whatsapp}{display}) . '</bdi>') : '';
  my $footer = qq{<footer class="bz-foot"><div class="wrap"><div class="bz-foot-grid"><div class="bz-foot-brand">$logo<p>} . T($l, 'biz_foot_blurb') . "</p>$wa</div>"
    . '<nav aria-label="' . T($l, 'biz_foot_svc') . '"><h2>' . T($l, 'biz_foot_svc') . '</h2><ul>' . join('', map { '<li><a href="' . path_for($l, "/business/$_->{key}/") . '">' . esc($_->{name}{$l}) . '</a></li>' } @svc)
    . ($BIZ->{tool} ? '<li><a href="' . path_for($l, '/business/qr-menu-generator/') . '">' . esc($BIZ->{tool}{name}{$l}) . '</a></li>' : '')
    . join('', map { '<li><a href="' . path_for($l, "/business/$_->{key}/") . '">' . esc($_->{name}{$l}) . '</a></li>' } @{ $BIZ->{audiences} // [] })
    . qq{<li><a href="$b#plans">} . T($l, 'biz_nav_plans') . '</a></li></ul></nav>'
    . '<nav aria-label="Foodidu"><h2>Foodidu</h2><ul><li><a href="' . path_for($l, '/') . '">' . T($l, 'biz_foot_main') . '</a></li><li><a href="' . path_for($l, '/privacy-policy/') . '">' . T($l, 'privacy') . '</a></li>'
    . '<li><a href="' . path_for($l, '/terms-and-conditions/') . '">' . T($l, 'terms') . '</a></li><li><button type="button" data-cookie-settings>' . T($l, 'cookie_settings') . '</button></li></ul></nav>'
    . qq{</div><p class="bz-foot-bottom">© $YEAR Foodidu Business</p></div></footer>}
    . ($BIZ->{whatsapp} ? '<a class="bz-float-wa" href="' . biz_wa($l, 'info') . '" target="_blank" rel="noopener" data-track="business_whatsapp_click" aria-label="' . T($l, 'biz_wa_float') . '">' . icon('whatsapp') . '</a>' : '');
  ($header, $footer);
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
  push @g, biz_org() if ($a{skin} // '') eq 'biz';
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
    [T($l, 'nav_shop'), "$codes#shopping", '', 'bag'], (@PUB ? [T($l, 'blog_nav'), path_for($l, '/blog/'), 'blog', 'menubook'] : ()), [T($l, 'nav_partner'), path_for($l, '/business/'), 'business', 'store'],
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
<link rel="preload" href="/fonts/readex-pro-@{[ $l eq 'ar' ? 'arabic' : 'latin' ]}-v27.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/lalezar-@{[ $l eq 'ar' ? 'arabic' : 'latin' ]}-v16.woff2" as="font" type="font/woff2" crossorigin>
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
@{[ @FO ? '<li><a href="' . path_for($l, '/first-order-promo-codes/') . '">' . T($l, 'fo_h1') . '</a></li>' : '' ]}
@{[ @DDEALS ? '<li><a href="' . path_for($l, '/day-deals/') . '">' . T($l, 'dd_nav') . '</a></li>' : '' ]}
@{[ @PUB ? '<li><a href="' . path_for($l, '/blog/') . '">' . T($l, 'blog_h1') . '</a></li>' : '' ]}
@{[ join '', map { '<li><a href="' . rest_url($_, $l) . '">' . Te($l, 'ro_h1', name => $_->{name}{$l}) . '</a></li>' } @RESTS ]}
<li><a href="@{[ path_for($l, '/business/') ]}">Foodidu Business</a></li>
@{[ $BIZ ? join '', map { '<li><a href="' . path_for($l, "/business/$_->{key}/") . '">' . esc($_->{name}{$l}) . '</a></li>' } grep { $_->{page} // 1 } @{ $BIZ->{services} } : '' ]}
@{[ $BIZ && $BIZ->{tool} ? '<li><a href="' . path_for($l, '/business/qr-menu-generator/') . '">' . esc($BIZ->{tool}{name}{$l}) . '</a></li>' : '' ]}
@{[ $BIZ && $BIZ->{whatsapp} ? qq{<li><a href="https://wa.me/$BIZ->{whatsapp}{number}" target="_blank" rel="noopener" data-track="business_whatsapp_click">} . T($l, 'foot_biz_wa') . ' <bdi dir="ltr">' . esc($BIZ->{whatsapp}{display}) . '</bdi></a></li>' : '' ]}
<li><a href="@{[ path_for($l, '/privacy-policy/') ]}">@{[ T($l, 'privacy') ]}</a></li>
<li><a href="@{[ path_for($l, '/terms-and-conditions/') ]}">@{[ T($l, 'terms') ]}</a></li>
<li><button type="button" data-cookie-settings>@{[ T($l, 'cookie_settings') ]}</button></li>
</ul></nav>
</div>
<div class="foot-bottom"><span>© $YEAR Foodidu. @{[ T($l, 'made') ]}</span><span>@{[ T($l, 'disclaimer') ]}</span></div>
</div>
</footer>
<div class="toast" id="toast" role="status" aria-live="polite"><img class="didu" src="/img/mascot/didu-party.svg" alt="" width="48" height="48"><span></span></div>
<div class="cookie" id="cookie" role="region" aria-label="@{[ T($l, 'cookies') ]}" hidden>
<p>@{[ T($l, 'cookie_text') ]} <a href="@{[ path_for($l, '/privacy-policy/') ]}">@{[ T($l, 'privacy') ]}</a></p>
<div class="row"><button class="btn btn-ink" type="button" data-accept>@{[ T($l, 'accept') ]}</button><button class="btn btn-line" type="button" data-decline>@{[ T($l, 'decline') ]}</button></div>
</div>
<script id="fd-data" type="application/json">$fd</script>
</body>
</html>
HTML
  $html =~ s/\n{2,}/\n/g;
  if (($a{skin} // '') eq 'biz') {   # Foodidu Business: its own header, footer, colours and fonts (static/css/biz.css)
    my ($bh, $bf) = biz_chrome($l, $key, $lang_link);
    $html =~ s{<header class="site-header is-home">.*?</header>}{$bh}s or die "biz header\n";
    $html =~ s{<footer class="site-footer">.*?</footer>}{$bf}s or die "biz footer\n";
    $html =~ s{<body>}{<body class="biz">};
    $html =~ s{<meta name="theme-color" content="#FFD15C">}{<meta name="theme-color" content="#0B6E4F">};
    $html =~ s{<link rel="preload" href="/fonts/lalezar[^>]*>\n}{};
    my $bcss = asset('/css/biz.css');
    $html =~ s{(<link rel="stylesheet" href="[^"]+">)}{$1\n<link rel="stylesheet" href="$bcss">};
    my $js = join '', map { qq{\n<script src="$_" defer></script>} } @{ $a{scripts} // [] };
    $html =~ s{(<script src="[^"]+" defer></script>)}{$1$js} if $js;
  }
  # the icons this page uses, once each, right after <body> (icon() only points at them)
  my %seen; my @used = grep { $ICON{$_} && !$seen{$_}++ } $html =~ /#ic-([A-Za-z0-9_]+)/g;
  my $sprite = '<svg class="sprite" width="0" height="0" style="position:absolute;overflow:hidden" aria-hidden="true" focusable="false">' . join('', map { qq{<symbol id="ic-$_" viewBox="0 0 24 24">$ICON{$_}</symbol>} } @used) . '</svg>';
  $html =~ s{(<body[^>]*>)}{$1
$sprite} or die "no <body> in $key
";
  my $file = $a{file} // "$OUT" . path_for($l, $key) . 'index.html';
  spit($file, $html);
  push @PAGES, { key => $key, lang => $l, lastmod => ($a{lastmod} // $DATA_DATE) } unless $a{noindex};
}

# A brand's codes: the main one first, then any "moreCodes" (each rendered as its own ticket).
sub offers_of {
  my $b = shift;
  # an extra code has its own lastVerified when it was checked on another day ("" = not checked yet); otherwise the brand's
  return ($b, map { +{ %$b, code => ($_->{noCode} ? '' : $_->{code}), noCode => ($_->{noCode} // 0), badge => $_->{badge}, offer => $_->{offer}, terms => $_->{terms}, exclusive => ($_->{exclusive} // 0), firstOrder => ($_->{firstOrder} // 0), extra => 1,
    lastVerified => (exists $_->{lastVerified} ? $_->{lastVerified} : $b->{lastVerified}) } } grep { !$_->{until} || $_->{until} ge $TODAY } @{ $b->{moreCodes} // [] });   # "until": gone after that day
}
sub offers_text { my ($b, $l) = @_; join ' · ', map { $_->{offer}{$l} } offers_of($b) }
sub search_index {   # $biz: + the Foodidu Business pages (home page only: the codes page is at its size limit)
  my ($l, $biz) = @_;
  [ (map { my $b = $_; { n => $b->{name}{$l}, s => join(' ', $b->{name}{en}, $b->{name}{ar}, map { $_->{code} } offers_of($b)), u => brand_url($b, $l), l => logo_src($b), o => offers_text($b, $l) } } @BRANDS),
    (map { my $r = $_; { n => $r->{name}{$l}, s => join(' ', $r->{name}{en}, $r->{name}{ar}, $r->{key}), u => rest_url($r, $l), l => logo_src($r), o => noffers($l, scalar @{ $r->{offers} }) . ' · ' . T($l, 'ro_from', min => fmt_n(rest_min($r))) } } @RESTS),
    ($BIZ && $biz ? biz_search($l) : ()) ];
}
# Foodidu Business in the site search: the landing page, each service page and the free QR tool (their "search" words in business.json)
sub biz_search {
  my ($l) = @_;
  my $ic = sub { "/img/biz/ic-$_[0].svg" };
  ({ n => 'Foodidu Business', s => 'business بيزنس للمطاعم restaurant', u => path_for($l, '/business/'), l => $ic->('store'), o => T($l, 'biz_search_o') },
   (map { { n => $_->{name}{$l}, s => join(' ', $_->{name}{en}, $_->{name}{ar}, $_->{search} // ''), u => path_for($l, "/business/$_->{key}/"), l => $ic->($_->{icon}), o => '' } } grep { $_->{page} // 1 } @{ $BIZ->{services} }),
   (map { { n => "Foodidu Business " . $_->{name}{$l}, s => join(' ', $_->{name}{en}, $_->{name}{ar}, $_->{search} // ''), u => path_for($l, "/business/$_->{key}/"), l => $ic->('store'), o => '' } } @{ $BIZ->{audiences} // [] }),
   ($BIZ->{tool} ? { n => $BIZ->{tool}{name}{$l}, s => join(' ', $BIZ->{tool}{name}{en}, $BIZ->{tool}{name}{ar}, $BIZ->{tool}{search} // ''), u => path_for($l, '/business/qr-menu-generator/'), l => $ic->('qr'), o => '' } : ()));

}
my %BYKEY = map { ($_->{key} => $_) } @BRANDS;
sub count_cat { my $c = shift; my @o = map { offers_of($_) } grep { $_->{category} eq $c } @BRANDS; scalar @o }
my @ALL_OFFERS = map { offers_of($_) } @BRANDS;
@FO = grep { $_->{firstOrder} } @ALL_OFFERS;   # codes for a new account's first order: /first-order-promo-codes/

# ------------------------------------------------------------------ blog (data/blog.json)
# Articles are written in a small Markdown (the dashboard shows the same help):
#   a blank line between blocks · ## section · ### subsection · - list · 1. list · > tip
#   **bold** · [text](brand:key) a code page · [text](page:/path/) a page of this site · [text](https://...) another site
#   {{code:key}} the brand's code and {{offer:key}} its offer, read from brands.json so an article never shows a stale code
#   [[codes: key, key]] on its own line: those brands' code tickets
# A published article must pass a quality gate (%BLOG_MIN) or the build stops: no thin or unlinked article goes live.
my %BLOG_MIN = (words => 400, sections => 2, links => 2);   # the dashboard checks the same numbers
sub post_url { my ($p, $l) = @_; path_for($l, "/blog/$p->{slug}/") }
sub md_brand { $BYKEY{ $_[0] } // die "blog: there is no brand \"$_[0]\" in brands.json\n" }
sub md_ref {
  my ($what, $k, $l) = @_;
  my $b = md_brand($k);
  return esc($b->{offer}{$l}) if $what eq 'offer';
  $b->{noCode} ? T($l, 'nocode') : '<strong dir="ltr">' . esc($b->{code}) . '</strong>';
}
sub md_link {
  my ($text, $href, $l, $st) = @_;   # both already escaped
  if ($href =~ /^brand:([a-z0-9-]+)$/) { $st->{links}++; return '<a href="' . brand_url(md_brand($1), $l) . qq{">$text</a>} }
  if ($href =~ m{^page:(/[A-Za-z0-9/-]*)$}) { $st->{links}++; return '<a href="' . path_for($l, $1) . qq{">$text</a>} }
  if ($href =~ m{^https://(?:www\.)?(amazon\.[a-z.]+|amzn\.to)/}) {   # affiliate link: "sponsored" for Google, tracked like a brand's own link
    my $host = $1; my ($b) = grep { ($_->{url} // '') =~ m{^https://(?:www\.)?\Q$host\E/} } @BRANDS;
    return qq{<a href="$href" rel="nofollow sponsored noopener" target="_blank" data-track="brand_link_click"} . ($b ? qq{ data-brand="$b->{key}"} : '') . ">$text</a>";
  }
  return qq{<a href="$href" rel="noopener" target="_blank">$text</a>} if $href =~ m{^https://};
  die "blog: the link \"$href\" must start with brand:, page:/ or https://\n";
}
sub md_inline {
  my ($s, $l, $st) = @_;
  $s = esc($s);
  $s =~ s/\{\{(code|offer):([a-z0-9-]+)\}\}/md_ref($1, $2, $l)/ge;
  $s =~ s/\*\*(.+?)\*\*/<strong>$1<\/strong>/g;
  $s =~ s/\[([^\]]+)\]\(([^)\s]+)\)/md_link($1, $2, $l, $st)/ge;
  $s;
}
sub md_html {   # -> (html, [[id, heading html], ...] for the table of contents)
  my ($src, $l, $st) = @_;
  $src = ($src // '') =~ s/^((?:#{2,3}\s|\[\[codes:).*)$/\n$1\n/mgr;   # headings and ticket rows are blocks of their own
  my (@out, @toc);
  for my $blk (split /\n[ \t]*\n/, $src) {
    $blk =~ s/^\s+|\s+$//g;
    next unless length $blk;
    my @lines = split /\n/, $blk;
    if ($blk =~ /^\[\[codes:\s*([a-z0-9,\s-]+)\]\]$/) {
      my @bs = map { md_brand($_) } grep { length } split /[\s,]+/, $1;
      $st->{links} += @bs;
      push @out, '<ul class="ticket-list post-codes">' . join('', map { map { ticket_li($_, $l) } offers_of($_) } @bs) . '</ul>';
    } elsif ($blk =~ /^(#{2,3})\s+(.+)$/) {
      my ($lvl, $h) = (length $1, md_inline($2, $l, $st));
      if ($lvl == 2) { my $id = 's' . (@toc + 1); push @toc, [$id, $h]; push @out, qq{<h2 id="$id">$h</h2>} }
      else { push @out, "<h3>$h</h3>" }
    } elsif (!grep { !/^-\s+/ } @lines) {
      push @out, '<ul>' . join('', map { '<li>' . md_inline(s/^-\s+//r, $l, $st) . '</li>' } @lines) . '</ul>';
    } elsif (!grep { !/^\d+\.\s+/ } @lines) {
      push @out, '<ol>' . join('', map { '<li>' . md_inline(s/^\d+\.\s+//r, $l, $st) . '</li>' } @lines) . '</ol>';
    } elsif ($blk =~ /^>/) {
      push @out, '<p class="post-tip">' . icon('info') . '<span>' . md_inline(join(' ', map { s/^>\s?//r } @lines), $l, $st) . '</span></p>';
    } else {
      push @out, '<p>' . md_inline(join(' ', @lines), $l, $st) . '</p>';
    }
  }
  (join("\n", @out), \@toc);
}
sub md_words { my $s = shift // ''; $s =~ s/\[\[codes:[^\]]*\]\]//g; $s =~ s/\{\{[^}]*\}\}/x/g; $s =~ s/\]\([^)]*\)/]/g; my $n = () = $s =~ /[\p{L}\p{N}]+/g; $n }
my $NCODES = scalar @ALL_OFFERS;
my @VERIFIED = sort grep { $_ } map { $_->{lastVerified} } @BRANDS;
# Brands without lastVerified were never checked by us: they never count as checked anywhere on the site.
my @CHECKED_BRANDS = grep { $_->{lastVerified} } @BRANDS;
my $ALL_FRESH = !grep { !fresh($_->{lastVerified}) } @CHECKED_BRANDS;
my $NCHECKED = scalar grep { $_->{lastVerified} } map { offers_of($_) } @CHECKED_BRANDS;

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
    : $d->{logo} ? qq{<img } . logo_attrs($d->{logo}, 44) . qq{ alt="} . Te($l, 'logo_alt', name => $name) . qq{" width="44" height="44" loading="lazy" decoding="async">}
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
sub rest_logo { my ($r, $l, $size) = @_; qq{<img } . logo_attrs($r->{logo}, $size) . qq{ alt="} . Te($l, 'logo_alt', name => $r->{name}{$l}) . qq{" width="$size" height="$size" loading="lazy" decoding="async">} }
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
# A restaurant's menu offers as a card in the same grid as the brand cards (home, codes page, other restaurant pages).
sub rest_card {
  my ($r, $l) = @_;
  my $deal = '<span>' . T($l, 'ro_card_save') . '</span><b dir="auto">' . rest_max_save($r) . '%</b>';
  my $meta = join ' · ', esc($CATN{ $r->{category} }{$l}), region_label($r, $l), noffers($l, scalar @{ $r->{offers} });
  return '<li><a class="bcard" href="' . rest_url($r, $l) . '"><span class="bcard-top"><span class="logo-tile">' . rest_logo($r, $l, 56) . '</span></span>'
    . '<span class="bcard-name">' . Te($l, 'ro_h1', name => $r->{name}{$l}) . qq{</span><span class="bcard-meta">$meta</span>}
    . '<span class="bcard-offer">' . T($l, 'ro_from', min => fmt_n(rest_min($r))) . '</span>'
    . qq{<span class="bcard-foot"><span class="bcard-deal">$deal</span>} . icon('arrow', 'flip go') . '</span></a></li>';
}
# Amazon picks (data/amazon-picks.json): the full list on the Amazon page, the first four on the home page under the featured banners.
sub pick_list {
  my ($l, $cls, @items) = @_;
  '<ul class="picks' . ($cls ? " $cls" : '') . '">' . join('', map { '<li class="pick"><span class="pick-ic pk-' . ($_->{icon} // 'bag') . '" aria-hidden="true">' . icon($_->{icon} ? "pk_$_->{icon}" : 'bag') . '</span><div><b>' . esc($_->{name}{$l}) . '</b><span>' . esc($_->{note}{$l}) . '</span></div><a class="btn btn-leaf" href="'
    . esc("$PICKS->{store}/dp/$_->{asin}?tag=$PICKS->{tag}") . qq{" rel="nofollow sponsored noopener" target="_blank" data-track="brand_link_click" data-brand="$PICKS->{brand}">} . T($l, 'pk_go') . ' ' . icon('external') . '</a></li>' } @items) . '</ul>';
}
# The latest published articles on the home page (nothing until one is published).
sub blog_home {
  my $l = shift;
  return '' unless @PUB;
  my @p = @PUB[0 .. ($#PUB < 1 ? $#PUB : 1)];
  qq{<section class="wrap section-tight home-blog" aria-labelledby="hblog-title"><div class="section-head"><div><p class="eyebrow">} . T($l, 'blog_eyebrow') . qq{</p><h2 class="h2" id="hblog-title">} . T($l, 'blog_h1') . '</h2></div>'
    . '<a class="btn btn-ink" href="' . path_for($l, '/blog/') . '">' . T($l, 'blog_all') . ' ' . icon('arrow', 'flip') . '</a></div><ul class="post-list">'
    . join('', map { '<li class="post-card"><h3><a href="' . post_url($_, $l) . '">' . esc($_->{h1}{$l}) . '</a></h3><p>' . esc($_->{lede}{$l}) . '</p><p class="post-meta"><span>' . icon('calendar') . T($l, 'blog_pub', date => fmt_date($l, $_->{published})) . '</span></p></li>' } @p)
    . '</ul></section>';
}
sub picks_home {
  my $l = shift;
  my @items = @{ $PICKS->{items} };
  my $b = $BYKEY{ $PICKS->{brand} // '' };
  return '' unless @items && $b;
  $#items = 3 if @items > 4;
  qq{<section class="wrap section-tight" aria-labelledby="hpk-title"><div class="section-head"><div><p class="eyebrow">} . T($l, 'pk_eyebrow') . qq{</p><h2 class="h2" id="hpk-title">} . T($l, 'pk_h2') . '</h2><p class="section-sub">' . T($l, 'pk_note') . '</p></div>'
    . '<a class="btn btn-ink" href="' . brand_url($b, $l) . '#picks-title">' . T($l, 'pk_all') . ' ' . icon('arrow', 'flip') . '</a></div>' . pick_list($l, 'grid2', @items) . '</section>';
}
# Featured-partner banners under the home hero (data/featured.json): one or more partners side by side ("partners",
# or the older single "partner"). Gone after "until"; site.js also hides them on that date when the site was not rebuilt.
sub feat_keys { my $p = $FEAT->{partners} // ($FEAT->{partner} ? [$FEAT->{partner}] : []); @$p }
sub featured_html {
  my $l = shift;
  my @keys = feat_keys();
  return '' unless $FEAT->{active} && @keys && !($FEAT->{until} && $FEAT->{until} lt $TODAY);
  my $tag = T($l, $FEAT->{sponsored} ? 'ft_sponsored' : 'ft_label');
  my $until = $FEAT->{until} ? qq{ data-until="$FEAT->{until}"} : '';
  my $cards = join '', map { feat_card($_, $l, $tag, @keys == 1) } @keys;
  return qq{<aside class="wrap feat-slot} . (@keys > 1 ? ' multi' : '') . qq{" aria-label="$tag"$until>$cards</aside>};
}
sub feat_card {   # one partner's banner; the custom title/text/cta/url apply only when the slot has a single partner
  my ($key, $l, $tag, $single) = @_;
  my ($r) = grep { $_->{key} eq $key } @RESTS;
  my $b = $BYKEY{$key};
  die "data/featured.json: unknown partner '$key'\n" unless $r || $b;
  my $name = ($r // $b)->{name}{$l};
  my ($title, $text, $cta, $url, $logo) = $r
    ? (Te($l, 'ft_rest_title', name => $name, p => rest_max_save($r)), T($l, 'ft_rest_text', n => noffers($l, scalar @{ $r->{offers} }), min => fmt_n(rest_min($r))),
       T($l, 'ft_rest_cta'), rest_url($r, $l), rest_logo($r, $l, 64))
    : (Te($l, 'ft_code_title', name => $name), esc(offers_text($b, $l)), T($l, 'ft_code_cta'), brand_url($b, $l), logo_img($b, $l, 64));
  my %own = !$single ? () : map { my $v = $FEAT->{$_}; ($_ => ref $v ? $v->{$l} : $v) } grep { $FEAT->{$_} } qw(title text cta url);
  ($title, $text, $cta) = map { defined $own{$_->[0]} ? esc($own{$_->[0]}) : $_->[1] } [title => $title], [text => $text], [cta => $cta];
  $url = $own{url} if $own{url};
  $text .= ' · ' . T($l, 'ft_until', date => fmt_date($l, $FEAT->{until})) if $FEAT->{until};
  my $rel = $url =~ m{^https?://} ? ($FEAT->{sponsored} ? ' rel="sponsored noopener"' : ' rel="noopener"') . ' target="_blank"' : '';
  my $trk = qq{ data-brand="$key" data-sponsored="} . ($FEAT->{sponsored} ? 'yes' : 'no') . '"';   # views and clicks for the partner's report
  return qq{<a class="feat" href="} . esc($url) . qq{"$rel data-track="featured_click" data-track-view="featured_view"$trk>}
    . '<span class="logo-tile">' . ($logo =~ s/ loading="lazy"//r) . qq{</span><span class="feat-body"><span class="feat-tag">$tag</span>}
    . qq{<span class="feat-title">$title</span><span class="feat-text">$text</span></span>}
    . qq{<span class="feat-cta">$cta } . icon('arrow', 'flip') . '</span></a>';
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
    $cats .= qq{<a class="cat" href="} . path_for($l, '/first-order-promo-codes/') . qq{"><span class="ic">} . icon('gift') . '</span><span><b>' . T($l, 'fo_h1') . '</b><small>' . ncodes($l, scalar @FO) . '</small></span>' . icon('arrow', 'go flip') . '</a>' if @FO;
    my $featured = join '', map { ticket_li($_, $l) } grep { $_->{featured} } @BRANDS;
    my $nfeat = grep { $_->{featured} } @BRANDS;
    my $logos = join '', (map { brand_card($_, $l) } grep { ($_->{priority} // '') ne 'low' } @BRANDS), (map { rest_card($_, $l) } @RESTS),
      (map { brand_card($_, $l) } grep { ($_->{priority} // '') eq 'low' } @BRANDS);
    my @facts = ([layers => nbrands($l, $n) =~ s/^(\d+)/<b>$1<\/b>/r], [pin => T($l, 'h_fact_region')]);
    push @facts, [shield => T($l, $NCHECKED < $NCODES ? 'h_fact_checked_n' : 'h_fact_checked', n => $NCHECKED, date => month_year($l, $VERIFIED[0]))] if $ALL_FRESH && @VERIFIED;
    push @facts, [gift => T($l, 'h_fact_free')];
    my $facts = join '', map { '<li>' . icon($_->[0]) . "<span>$_->[1]</span></li>" } @facts;
    my @qa = map { [T($l, "q$_"), T($l, "a$_", partners => path_for($l, '/business/'))] } 1 .. 5;
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
<img class="sticker" src="/img/mascot/didu.svg" alt="" width="170" height="170">
</div>
</div>
</section>
<div class="scallop" aria-hidden="true"></div>
<section class="wrap section-tight" aria-labelledby="cats-title">
<div class="section-head"><div><p class="eyebrow">@{[ T($l, 'h_cat_eyebrow') ]}</p><h2 class="h2" id="cats-title">@{[ T($l, 'h_cat_title') ]}</h2></div></div>
<div class="cats">$cats</div>
</section>
@{[ featured_html($l) ]}
<section class="wrap section-tight home-feat" aria-labelledby="feat-title">
<div class="section-head"><div><p class="eyebrow">@{[ T($l, 'h_feat_eyebrow') ]}</p><h2 class="h2" id="feat-title">@{[ T($l, 'h_feat_title') ]}</h2><p class="section-sub">@{[ T($l, 'h_feat_sub') ]}</p></div>
<a class="btn btn-ink" href="$codes">@{[ T($l, 'h_see_all', n => $NCODES) ]} @{[ icon('arrow', 'flip') ]}</a></div>
<ul class="ticket-list">$featured</ul>
@{[ $nfeat > 6 ? qq{<p class="more-mobile"><a class="btn btn-ink" href="$codes">} . T($l, 'h_see_all', n => $NCODES) . ' ' . icon('arrow', 'flip') . '</a></p>' : '' ]}
</section>
@{[ @DDEALS ? qq{<section class="wrap section-tight home-dd" aria-labelledby="dd-title"><div class="section-head"><div><p class="eyebrow">} . T($l, 'dd_eyebrow') . qq{</p><h2 class="h2" id="dd-title">} . T($l, 'dd_title') . '</h2><p class="section-sub">' . T($l, 'dd_sub') . qq{</p></div><a class="btn btn-ink" href="} . path_for($l, '/day-deals/') . '">' . T($l, 'dd_all') . ' ' . icon('arrow', 'flip') . '</a></div>' . dday_list($l, @DDEALS) . (@DDEALS > 3 ? '<p class="more-dd"><a class="btn btn-ink" href="' . path_for($l, '/day-deals/') . '">' . T($l, 'dd_all') . ' (' . scalar(@DDEALS) . ') ' . icon('arrow', 'flip') . '</a></p>' : '') . '</section>' : '' ]}
@{[ picks_home($l) ]}
@{[ wa_cta($l) ]}
<section class="wrap section-tight home-brands" aria-labelledby="brands-title">
<div class="section-head"><div><p class="eyebrow">@{[ T($l, 'h_brands_eyebrow') ]}</p><h2 class="h2" id="brands-title">@{[ T($l, 'h_brands_title') ]}</h2><p class="section-sub">@{[ T($l, 'h_brands_sub') ]}</p></div>
<a class="btn btn-ink" href="$codes">@{[ T($l, 'h_see_all', n => $NCODES) ]} @{[ icon('arrow', 'flip') ]}</a></div>
<ul class="brand-cards">$logos</ul>
<p class="more-mobile"><a class="btn btn-ink" href="$codes">@{[ T($l, 'h_see_all', n => $NCODES) ]} @{[ icon('arrow', 'flip') ]}</a></p>
</section>
<section class="wrap section-tight" aria-labelledby="how-title">
<div class="section-head"><div><p class="eyebrow">@{[ T($l, 'h_how_eyebrow') ]}</p><h2 class="h2" id="how-title">@{[ T($l, 'h_how_title') ]}</h2></div></div>
<ol class="steps">
<li class="step"><span class="num" aria-hidden="true">@{[ $l eq 'ar' ? '١' : '1' ]}</span><h3>@{[ T($l, 'h_s1') ]}</h3><p>@{[ T($l, 'h_s1p') ]}</p></li>
<li class="step"><span class="num" aria-hidden="true">@{[ $l eq 'ar' ? '٢' : '2' ]}</span><h3>@{[ T($l, 'h_s2') ]}</h3><p>@{[ T($l, 'h_s2p') ]}</p></li>
<li class="step"><span class="num" aria-hidden="true">@{[ $l eq 'ar' ? '٣' : '3' ]}</span><h3>@{[ T($l, 'h_s3') ]}</h3><p>@{[ T($l, 'h_s3p') ]}</p></li>
</ol>
</section>
<section class="wrap section-tight" aria-labelledby="why-title">
<div class="section-head"><div><p class="eyebrow">@{[ T($l, 'h_why_eyebrow') ]}</p><h2 class="h2" id="why-title">@{[ T($l, 'h_why_title') ]}</h2></div></div>
<ul class="why">
<li>@{[ icon('layers') ]}<h3>@{[ T($l, 'h_w1') ]}</h3><p>@{[ T($l, 'h_w1p') ]}</p></li>
<li>@{[ icon('list') ]}<h3>@{[ T($l, 'h_w2') ]}</h3><p>@{[ T($l, 'h_w2p') ]}</p></li>
<li>@{[ icon('lang') ]}<h3>@{[ T($l, 'h_w3') ]}</h3><p>@{[ T($l, 'h_w3p') ]}</p></li>
<li>@{[ icon('gift') ]}<h3>@{[ T($l, 'h_w4') ]}</h3><p>@{[ T($l, 'h_w4p') ]}</p></li>
</ul>
</section>
@{[ app_section($l) ]}
@{[ blog_home($l) ]}
@{[ band($l, 1) ]}
<section class="wrap section-tight two-col" aria-labelledby="faq-title">
<div><p class="eyebrow">@{[ T($l, 'faq_eyebrow') ]}</p><h2 class="h2" id="faq-title">@{[ T($l, 'faq_title') ]}</h2></div>
@{[ faq_html(@qa) ]}
</section>
HTML
    layout(lang => $l, key => '/', title => T($l, 'h_title'), desc => T($l, 'h_desc'), body => $body,
      ld => [ faq_ld(@qa), { '@type' => 'MobileApplication', name => 'Foodidu', alternateName => 'فوديدو', operatingSystem => 'Android',
        applicationCategory => 'LifestyleApplication', installUrl => $PLAY_URL, url => $PLAY_URL, description => strip_tags(T($l, 'app_sub')),
        publisher => { '@id' => "$SITE/#org" }, offers => { '@type' => 'Offer', price => '0', priceCurrency => 'EGP' } } ],
      fd => { brands => search_index($l, 1) }, og => "/img/og/home-$l.png");
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
@{[ @FO ? '<p class="lede-link"><a href="' . path_for($l, '/first-order-promo-codes/') . '">' . icon('gift') . T($l, 'fo_all') . ' ' . icon('arrow', 'flip') . '</a></p>' : '' ]}
@{[ search_form($l) ]}
</div>
</section>
<div class="scallop" aria-hidden="true"></div>
<section class="wrap section-tight">
<div class="filters" role="group" aria-label="@{[ T($l, 'c_filters') ]}">$chips</div>
<div id="codes" data-filterable>$groups</div>
<p class="empty" data-empty hidden><img class="didu" src="/img/mascot/didu-search.svg" alt="" width="120" height="120" loading="lazy">@{[ T($l, 'c_empty') ]}</p>
<section class="ro-hub" id="restaurant-offers" aria-labelledby="g-ro"><div class="group-head"><span class="ic">@{[ icon('fork') ]}</span><h2 id="g-ro">@{[ T($l, 'c_rest_title') ]}</h2></div>
<p class="section-sub">@{[ T($l, 'c_rest_sub') ]}</p>
<ul class="brand-cards">@{[ join '', map { rest_card($_, $l) } @RESTS ]}</ul></section>
</section>
@{[ wa_cta($l) ]}
@{[ band($l) ]}
HTML
    my $i = 0;
    layout(lang => $l, key => '/promo-codes/', title => T($l, 'c_title') . ' | Foodidu', desc => T($l, 'c_desc'), body => $body, nav => 'codes',
      crumbs => $crumbs, pagetype => 'CollectionPage', og => "/img/og/codes-$l.png", fd => { brands => search_index($l) },
      ld => [ { '@type' => 'ItemList', name => T($l, 'c_h1'), numberOfItems => $n,
        itemListElement => [ map { { '@type' => 'ListItem', position => ++$i, name => $_->{name}{$l}, url => absu(brand_url($_, $l)) } } @BRANDS ] } ]);
  }

  # ---------- first-order codes: every code that works on a new account's first order ("firstOrder": true)
  if (@FO) {
    my $fo_url = path_for($l, '/first-order-promo-codes/');
    my @fob = do { my %s; grep { !$s{ $_->{key} }++ } @FO };   # brands with a first-order code, in list order
    my $list = join($l eq 'ar' ? '، ' : ', ', map { $_->{name}{$l} } @fob[0 .. ($#fob < 3 ? $#fob : 3)]);
    my $groups = join '', map {
      my $c = $_;
      my @bs = grep { $_->{category} eq $c } @FO;
      @bs ? qq{<section class="group" id="fo-$c" aria-labelledby="fo-g-$c"><div class="group-head"><span class="ic">} . icon($CATICON{$c}) . qq{</span><h2 id="fo-g-$c">} . T($l, "c_group_$c") . '</h2><span class="n">' . ncodes($l, scalar @bs) . '</span></div>'
        . '<ul class="ticket-list">' . join('', map { ticket_li($_, $l) } @bs) . '</ul></section>' : '';
    } @CATS;
    my @qa = map { [T($l, "fo_q$_"), T($l, "fo_a$_")] } 1 .. 3;
    my $crumbs = [[T($l, 'home'), path_for($l, '/')], [T($l, 'c_h1'), $codes], [T($l, 'fo_h1'), $fo_url]];
    my $body = <<"HTML";
<section class="page-hero">
<div class="wrap">
@{[ crumbs_html($l, $crumbs) ]}
<h1>@{[ T($l, 'fo_h1') ]}</h1>
<p class="lede">@{[ T($l, 'fo_lede', n => ncodes($l, scalar @FO), b => nbrands($l, scalar @fob)) ]}</p>
</div>
</section>
<div class="scallop" aria-hidden="true"></div>
<section class="wrap section-tight">
$groups
</section>
<section class="wrap section-tight" aria-labelledby="fo-how-title">
<div class="section-head"><h2 class="h2" id="fo-how-title">@{[ T($l, 'fo_how') ]}</h2></div>
<ol class="steps">
<li class="step"><span class="num" aria-hidden="true">@{[ $l eq 'ar' ? '١' : '1' ]}</span><h3>@{[ T($l, 'fo_s1') ]}</h3><p>@{[ T($l, 'fo_s1p') ]}</p></li>
<li class="step"><span class="num" aria-hidden="true">@{[ $l eq 'ar' ? '٢' : '2' ]}</span><h3>@{[ T($l, 'fo_s2') ]}</h3><p>@{[ T($l, 'fo_s2p') ]}</p></li>
<li class="step"><span class="num" aria-hidden="true">@{[ $l eq 'ar' ? '٣' : '3' ]}</span><h3>@{[ T($l, 'fo_s3') ]}</h3><p>@{[ T($l, 'fo_s3p') ]}</p></li>
</ol>
</section>
<section class="wrap section-tight two-col" aria-labelledby="fofaq-title">
<div><p class="eyebrow">@{[ T($l, 'faq_eyebrow') ]}</p><h2 class="h2" id="fofaq-title">@{[ T($l, 'faq_title') ]}</h2></div>
@{[ faq_html(@qa) ]}
</section>
@{[ wa_cta($l) ]}
@{[ band($l) ]}
HTML
    my $i = 0;
    layout(lang => $l, key => '/first-order-promo-codes/', title => T($l, 'fo_title') . ' | Foodidu', desc => T($l, 'fo_desc', n => scalar @FO, list => $list),
      body => $body, nav => 'codes', crumbs => $crumbs, pagetype => 'CollectionPage', og => "/img/og/codes-$l.png",
      ld => [ { '@type' => 'ItemList', name => T($l, 'fo_h1'), numberOfItems => scalar @fob,
        itemListElement => [ map { { '@type' => 'ListItem', position => ++$i, name => $_->{name}{$l}, url => absu(brand_url($_, $l)) } } @fob ] }, faq_ld(@qa) ]);
  }

  # ---------- blog: every article at /blog/<slug>/ (a draft is built too, for review, but noindex and linked from nowhere)
  for my $p (@POSTS) {
    my $draft = ($p->{status} // '') ne 'published';
    my $st = { links => 0 };
    my ($art, $toc) = md_html($p->{body}{$l}, $l, $st);
    my @pb = map { md_brand($_) } @{ $p->{brands} // [] };
    my @qa = map { [esc($_->{q}{$l}), md_inline($_->{a}{$l}, $l, { links => 0 })] } @{ $p->{faq} // [] };
    unless ($draft) {   # quality gate: a thin or unlinked article never goes live
      my $w = md_words($p->{body}{$l});
      my @bad = (
        ($w < $BLOG_MIN{words} ? "$w words (needs $BLOG_MIN{words})" : ()),
        (@$toc < $BLOG_MIN{sections} ? scalar(@$toc) . " sections (needs $BLOG_MIN{sections} ## headings)" : ()),
        ($st->{links} < $BLOG_MIN{links} ? "$st->{links} links to code pages (needs $BLOG_MIN{links})" : ()),
        ($p->{published} ? () : 'no published date'),
      );
      die "blog \"$p->{slug}\" ($l) can't be published yet: " . join('; ', @bad) . "\n" if @bad;
      warn "blog \"$p->{slug}\": its season ended on $p->{seasonEnd}, update it for the next one\n" if $l eq 'en' && $p->{seasonEnd} && $TODAY gt $p->{seasonEnd};
    }
    my $purl = post_url($p, $l);
    my $crumbs = [[T($l, 'home'), path_for($l, '/')], (@PUB ? [T($l, 'blog_h1'), path_for($l, '/blog/')] : ()), [$p->{h1}{$l}, $purl]];
    my $upd = $p->{updated} && $p->{published} && $p->{updated} gt $p->{published} ? $p->{updated} : '';
    my $meta = '<p class="post-meta"><span>' . T($l, 'blog_by') . '</span>'
      . ($p->{published} ? '<span>' . icon('calendar') . T($l, 'blog_pub', date => fmt_date($l, $p->{published})) . '</span>' : '')
      . ($upd ? '<span>' . T($l, 'blog_upd', date => fmt_date($l, $upd)) . '</span>' : '') . '</p>';
    my $notes = ($draft ? '<p class="note post-note">' . T($l, 'blog_draft') . '</p>' : '')
      . ($p->{seasonEnd} && $TODAY gt $p->{seasonEnd} ? '<p class="note post-note">' . T($l, 'blog_ended', date => fmt_date($l, $p->{seasonEnd})) . '</p>' : '');
    my $tocnav = @$toc >= 3 ? '<nav class="post-toc" aria-label="' . T($l, 'blog_toc') . '"><p><b>' . T($l, 'blog_toc') . '</b></p><ol>'
      . join('', map { qq{<li><a href="#$_->[0]">} . ($_->[1] =~ s/<[^>]+>//gr) . '</a></li>' } @$toc) . '</ol></nav>' : '';
    my $faq = @qa ? qq{<section class="post-faq" aria-labelledby="pfaq-title"><h2 id="pfaq-title">} . T($l, 'faq_eyebrow') . '</h2>' . faq_html(@qa) . '</section>' : '';
    my $side = @pb ? '<div class="side-card"><h2>' . T($l, 'blog_codes') . '</h2><ul class="side-list">' . join('', map {
      '<li><a href="' . brand_url($_, $l) . '"><span class="logo-tile">' . logo_img($_, $l, 42) . '</span><span><b>' . esc($_->{name}{$l}) . '</b><small>' . esc($_->{offer}{$l}) . '</small></span></a></li>'
    } @pb) . '</ul></div>' : '';
    my $body = <<"HTML";
<section class="page-hero">
<div class="wrap">
@{[ crumbs_html($l, $crumbs) ]}
<h1>@{[ esc($p->{h1}{$l}) ]}</h1>
<p class="lede">@{[ esc($p->{lede}{$l}) ]}</p>
$meta
</div>
</section>
<div class="scallop" aria-hidden="true"></div>
<div class="wrap brand-body post-body">
<article class="prose post">
$notes$tocnav
$art
$faq
</article>
<aside class="side">
$side
@{[ wa_cta($l, 1) ]}
</aside>
</div>
@{[ band($l) ]}
HTML
    my $t = $p->{seo}{$l}{title};
    layout(lang => $l, key => "/blog/$p->{slug}/", title => (length($t) + 10 <= 65 ? "$t | Foodidu" : $t), desc => $p->{seo}{$l}{description},
      body => $body, nav => 'blog', crumbs => $crumbs, noindex => $draft, og => "/img/og/codes-$l.png", lastmod => ($upd || $p->{published} || $TODAY),
      ld => [ { '@type' => 'BlogPosting', headline => $p->{h1}{$l}, description => $p->{seo}{$l}{description}, inLanguage => $l,
        ($p->{published} ? (datePublished => $p->{published}, dateModified => ($upd || $p->{published})) : ()),
        author => { '@type' => 'Organization', name => T($l, 'blog_author'), url => "$SITE/" }, publisher => { '@id' => "$SITE/#org" },
        mainEntityOfPage => { '@id' => absu($purl) . '#webpage' }, image => absu("/img/og/codes-$l.png") }, (@qa ? faq_ld(@qa) : ()) ]);
  }

  # ---------- blog index: once an article is published
  if (@PUB) {
    my $burl = path_for($l, '/blog/');
    my $crumbs = [[T($l, 'home'), path_for($l, '/')], [T($l, 'blog_h1'), $burl]];
    my $cards = join '', map {
      '<li class="post-card"><h2><a href="' . post_url($_, $l) . '">' . esc($_->{h1}{$l}) . '</a></h2><p>' . esc($_->{lede}{$l}) . '</p>'
      . '<p class="post-meta"><span>' . icon('calendar') . T($l, 'blog_pub', date => fmt_date($l, $_->{published})) . '</span></p></li>'
    } @PUB;
    my $body = <<"HTML";
<section class="page-hero">
<div class="wrap">
@{[ crumbs_html($l, $crumbs) ]}
<h1>@{[ T($l, 'blog_h1') ]}</h1>
<p class="lede">@{[ T($l, 'blog_lede') ]}</p>
</div>
</section>
<div class="scallop" aria-hidden="true"></div>
<section class="wrap section-tight"><ul class="post-list">$cards</ul></section>
@{[ wa_cta($l) ]}
@{[ band($l) ]}
HTML
    my $i = 0;
    layout(lang => $l, key => '/blog/', title => T($l, 'blog_title') . ' | Foodidu', desc => T($l, 'blog_desc'), body => $body, nav => 'blog', crumbs => $crumbs,
      pagetype => 'CollectionPage', og => "/img/og/codes-$l.png", lastmod => (sort map { $_->{updated} // $_->{published} } @PUB)[-1],
      ld => [ { '@type' => 'ItemList', name => T($l, 'blog_h1'), numberOfItems => scalar @PUB,
        itemListElement => [ map { { '@type' => 'ListItem', position => ++$i, name => $_->{h1}{$l}, url => absu(post_url($_, $l)) } } @PUB ] } ]);
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
    my $social = join '', map { qq{<a class="btn btn-line" href="$_->[2]" rel="noopener" target="_blank">} . icon($_->[0]) . " $_->[1]</a>" } grep { $_->[0] =~ /^(?:facebook|instagram)$/ } @SOCIAL;
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
@{[ wa_cta($l) ]}
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
    my @rcodes = (grep { $_->{category} eq 'restaurants' && ($_->{priority} // '') ne 'low' } @BRANDS)[0 .. 3];
    my $more = join '', (map { rest_card($_, $l) } grep { $_ ne $r } @RESTS), (map { brand_card($_, $l) } grep { defined } @rcodes);
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
<section class="wrap section-tight" aria-labelledby="more-title">
<div class="section-head"><h2 class="h2" id="more-title">@{[ T($l, 'ro_more') ]}</h2></div>
<ul class="brand-cards">$more</ul>
</section>
@{[ wa_cta($l) ]}
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
    my @coded = grep { !$_->{noCode} } @offers;   # an extra offer can apply by itself, with no code
    my $mixed = @coded && @coded < @offers;
    my $nn = sub { $mixed ? noffers(@_) : ncodes(@_) };
    my $strong = sub { '<strong dir="ltr">' . esc($_[0]{code}) . '</strong>' };
    my $codes_or = join($l eq 'ar' ? ' أو ' : ' or ', map { $strong->($_) } @coded);
    my $is_fresh = fresh($b->{lastVerified});
    my $tbase = $b->{seo}{$l}{title} . ($is_fresh ? ' (' . month_year($l, $b->{lastVerified}) . ')' : '');
    my $title = length($tbase) + 10 <= 65 ? "$tbase | Foodidu" : $tbase;   # keep the month visible in Google; drop the suffix if too long
    my $verified = $is_fresh ? '<span class="bp-check" role="img" aria-label="' . T($l, 'b_f_checked') . '" title="' . T($l, 'b_f_checked') . '">' . icon('check') . '</span>' : '';
    my @facts = ([pin => T($l, 'b_f_region'), region_label($b, $l)], [store => T($l, 'b_f_where'), $where]);
    push @facts, [shield => T($l, 'b_f_checked'), fmt_date($l, $b->{lastVerified})] if $is_fresh;
    push @facts, [gift => T($l, 'b_f_cost'), T($l, 'h_fact_free')];
    my $facts = join '', map { '<li>' . icon($_->[0]) . "<span><small>$_->[1]</small><b>$_->[2]</b></span></li>" } @facts;
    my $go = $b->{url} ? qq{<a class="btn btn-leaf" href="} . esc($b->{url}) . qq{" rel="nofollow sponsored noopener" target="_blank" data-track="brand_link_click" data-brand="$b->{key}">} . ($b->{urlLabel} ? esc($b->{urlLabel}{$l}) : Te($l, 'b_go', name => $name)) . ' ' . icon('external') . '</a>' : '';
    my $lede = $multi ? $nn->($l, scalar @offers) . ': ' . join($l eq 'ar' ? '، أو ' : ', or ', map { esc($_->{offer}{$l}) } @offers) : $offer;
    my $a1 = $multi
      ? T($l, $mixed ? 'b_a1_mixed' : 'b_a1_multi', name => $en, list => join($l eq 'ar' ? '، و' : ' and ', map { $_->{noCode} ? T($l, 'nocode_item', offer => esc($_->{offer}{$l})) : ($l eq 'ar' ? 'كود ' : '') . $strong->($_) . ' (' . esc($_->{offer}{$l}) . ')' } @offers))
      : T($l, 'b_a1', name => $en, code => qq{<strong dir="ltr">$code</strong>}, offer => $offer);
    my $nc = $b->{noCode};   # a discount without a code
    my @qa = $nc ? (
      [Te($l, 'b_nq1', name => $name), $b->{steps} ? T($l, 'b_na1s', offer => $offer, terms => $terms) : T($l, 'b_na1', offer => $offer, where => $where)],
      [T($l, 'b_nq3'), $terms],
      [Te($l, 'b_nq4', name => $name), T($l, 'b_na4', name => $en, where => $where)],
    ) : (
      [Te($l, 'b_q1', name => $name), $a1],
      [Te($l, 'b_q2', name => $name), T($l, 'b_a2', code => $codes_or, where => $where)],
      [T($l, 'b_q3'), $multi ? join(' ', map { ($_->{noCode} ? '<strong>' . T($l, 'nocode') . '</strong>' : $strong->($_)) . ': ' . esc($_->{terms}{$l}) } @offers) : $terms],
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
    my @picks = ($PICKS->{brand} // '') eq $b->{key} ? @{ $PICKS->{items} } : ();
    my $picks = @picks ? '<section aria-labelledby="picks-title"><h2 id="picks-title">' . T($l, 'pk_h2') . '</h2><p class="note pk-note">' . T($l, 'pk_note') . '</p>' . pick_list($l, '', @picks) . '</section>' : '';
    my @cat = grep { $_->{category} eq $b->{category} } @BRANDS;
    my @top = grep { ($_->{priority} // '') ne 'low' } @cat;   # low-priority codes are never the suggested ones
    my ($pos) = grep { $top[$_] eq $b } 0 .. $#top;
    my @same = defined $pos ? map { $top[($pos + $_) % @top] } 1 .. $#top : @top;   # the brands after this one, wrapping round
    my @rest = grep { $_->{category} ne $b->{category} } @BRANDS;
    my @related = grep { defined } (@same, @rest)[0 .. 2];
    my $catlinks = join '', (map { '<li><a href="' . brand_url($_, $l) . '">' . esc($_->{name}{$l}) . '</a></li>' } grep { $_ ne $b } @cat),
      ($b->{category} eq 'restaurants' ? map { '<li><a href="' . rest_url($_, $l) . '">' . Te($l, 'ro_h1', name => $_->{name}{$l}) . '</a></li>' } @RESTS : ()),
      ((grep { $_->{firstOrder} } @offers) ? '<li><a href="' . path_for($l, '/first-order-promo-codes/') . '">' . T($l, 'fo_all') . '</a></li>' : ()),
      (map { '<li><a href="' . post_url($_, $l) . '">' . esc($_->{h1}{$l}) . '</a></li>' } grep { my $p = $_; grep { $_ eq $b->{key} } @{ $p->{brands} // [] } } @PUB);
    my $related = join '', map { ticket_li($_, $l) } @related;
    my $sidecats = join '', map { qq{<li><a href="} . path_for($l, '/promo-codes/') . qq{#$_"><span class="logo-tile">} . icon($CATICON{$_}) . '</span><span><b>' . esc($CATN{$_}{$l}) . '</b><small>' . ncodes($l, count_cat($_)) . '</small></span></a></li>' } @CATS;
    my $crumbs = [[T($l, 'home'), path_for($l, '/')], [T($l, 'c_h1'), path_for($l, '/promo-codes/')], [$name, $url]];
    my $flag = $b->{exclusive} ? '<span class="pill pill-leaf">' . icon('gift') . T($l, 'exclusive') . '</span>' : '';
    my $count = $multi ? '<span class="pill">' . icon('tag') . $nn->($l, scalar @offers) . '</span>' : '';
    my $body = <<"HTML";
<section class="page-hero brand-hero">
<div class="wrap">
@{[ crumbs_html($l, $crumbs) ]}
<div class="bp">
<div class="bp-id"><span class="bp-logo"><span class="logo-tile">@{[ logo_img($b, $l, 104, 1) ]}</span>$verified</span>
<div class="bp-head"><div class="pill-row"><span class="pill">@{[ icon($CATICON{$b->{category}}) ]}@{[ esc($CATN{$b->{category}}{$l}) ]}</span>$flag$count</div>
<h1>@{[ Te($l, $nc ? 'b_h1_nocode' : @coded > 1 ? 'b_h1_multi' : 'b_h1', name => $name) ]}</h1></div></div>
<div class="bp-lede"><p class="lede">$lede</p>@{[ $b->{note} && $b->{note}{$l} ? '<p class="bp-note">' . icon('info') . '<span>' . esc($b->{note}{$l}) . '</span></p>' : '' ]}</div>
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
$picks
<section aria-labelledby="how-title"><h2 id="how-title">@{[ Te($l, $nc ? 'b_how_nocode' : 'b_how', name => $name) ]}</h2>
<ol class="how">
@{[ $nc && $b->{steps} ? join('', map { '<li><div><b>' . esc($_->[0]) . '</b><span>' . esc($_->[1]) . '</span></div></li>' } @{ $b->{steps}{$l} })
  : $nc ? join('', map { '<li><div><b>' . T($l, "b_nst$_", where => $where) . '</b><span>' . T($l, $_ == 1 && !$b->{url} ? 'b_nst1p_self' : "b_nst${_}p") . '</span></div></li>' } 1 .. 3) : <<"STEPS" ]}
<li><div><b>@{[ T($l, 'b_st1') ]}</b><span>@{[ @coded > 1 ? T($l, 'b_st1p_multi') : T($l, 'b_st1p', code => qq{<strong dir="ltr">$code</strong>}) ]}</span></div></li>
<li><div><b>@{[ T($l, 'b_st2', where => $where) ]}</b><span>@{[ T($l, 'b_st2p') ]}</span></div></li>
<li><div><b>@{[ T($l, 'b_st3') ]}</b><span>@{[ T($l, 'b_st3p') ]}</span></div></li>
STEPS
</ol></section>
<section aria-labelledby="about-title"><h2 id="about-title">@{[ Te($l, 'b_about', name => $name) ]}</h2><p>@{[ esc($b->{about}{$l}) ]}</p></section>
$bdd
<section aria-labelledby="faq-title"><h2 id="faq-title">@{[ Te($l, $nc ? 'b_faq_nocode' : 'b_faq', name => $name) ]}</h2>@{[ faq_html(@qa) ]}
<p class="note">@{[ Te($l, 'b_note', name => $name) ]}</p></section>
</article>
<aside class="side">
<div class="side-card side-codes"><h2>@{[ Te($l, $nc ? 'b_side_nocode' : @coded > 1 ? 'b_side_codes' : 'b_side_code', name => $name) ]}</h2>$side_codes</div>
@{[ wa_cta($l, 1) ]}
<div class="side-card"><h2>@{[ T($l, 'b_side_cats') ]}</h2><ul class="side-list">$sidecats</ul></div>
</aside>
</div>
<section class="wrap section-tight" aria-labelledby="rel-title">
<div class="section-head"><h2 class="h2" id="rel-title">@{[ T($l, 'b_related', cat => T($l, "cat_def_$b->{category}")) ]}</h2></div>
<ul class="ticket-list">$related</ul>
<nav class="cat-links" aria-labelledby="cat-links-title"><h3 id="cat-links-title">@{[ T($l, 'b_all_cat', cat => T($l, "cat_def_$b->{category}")) ]}</h3><ul>$catlinks</ul></nav>
</section>
HTML
    layout(lang => $l, key => "/$b->{slug}/", title => $title, desc => $b->{seo}{$l}{description}, body => $body, nav => 'codes',
      crumbs => $crumbs, og => "/img/og/$b->{key}-$l.png", about => { '@type' => 'Brand', name => $b->{name}{en}, alternateName => $b->{name}{ar} },
      ld => [ faq_ld(@qa) ], lastmod => (sort grep { $_ } $b->{lastVerified}, $DATA_DATE, (@bdd ? $DD_DATE : ()))[-1]);
  }

  # ---------- Foodidu Business (data/business.json): /business/ and one page per service; /partners/ redirects here.
  # Its own look, like a software company's site (layout skin 'biz', static/css/biz.css), not the Foodidu deals style.
  if ($BIZ) {
    my $burl = path_for($l, '/business/');
    my @svc = @{ $BIZ->{services} };
    my $surl = sub { path_for($l, "/business/$_[0]{key}/") };
    my $has_page = sub { $_[0]{page} // 1 };
    my $num = sub { $l eq 'ar' ? (qw(١ ٢ ٣ ٤ ٥ ٦))[$_[0] - 1] : $_[0] };
    my %row_mock = ('loyalty-program' => 'card', 'qr-menu' => 'phone', 'restaurant-website' => 'web', 'google-maps' => 'maps', visibility => 'ticket');
    my $btns = sub { '<div class="bz-btns"><a class="bz-btn bz-pri" href="' . $burl . '#join">' . T($l, 'biz_start') . ' ' . icon('arrow', 'flip') . '</a><a class="bz-btn bz-ghost" href="' . $burl . '#plans">' . T($l, 'biz_plans_btn') . '</a>'
      . biz_wa_link($l, $_[0] // 'info', 'bz-btn bz-waghost', T($l, 'biz_wa_btn')) . '</div>' };
    my $ticks = sub { '<ul class="bz-ticks">' . join('', map { '<li>' . icon('check') . '<span>' . T($l, $_) . '</span></li>' } @_) . '</ul>' };
    # the quick request: name, contact, phone (static/js/site.js sends it like the full form; businessType is set on the audience pages)
    my $quick = sub { my ($type) = @_; my $q = $BIZ->{quick} or return '';
      '<form class="bz-quick" id="quick-lead-form" novalidate aria-labelledby="quick-title"><p class="bz-quick-t" id="quick-title">' . esc($q->{title}{$l}) . '</p><div class="bz-quick-row">'
      . join('', map { my ($id, $name, $lab, $more) = @$_; qq{<div class="field"><label class="sr-only" for="$id">} . T($l, $lab) . qq{</label><input id="$id" name="$name" required placeholder="} . T($l, $lab) . qq{" $more></div>} }
          ['q-business', 'businessName', 'f_business', 'maxlength="200" autocomplete="organization"'], ['q-contact', 'contactPerson', 'f_contact', 'maxlength="200" autocomplete="name"'],
          ['q-phone', 'phone', 'f_phone', 'type="tel" maxlength="40" autocomplete="tel" inputmode="tel"'])
      . ($type ? qq{<input type="hidden" name="businessType" value="$type">} : '')
      . '<button class="bz-btn bz-pri" type="submit">' . esc($q->{button}{$l}) . ' ' . icon('arrow', 'flip') . '</button></div>'
      . '<p class="form-status" id="quick-status" role="status" tabindex="-1" hidden></p>'
      . '<p class="bz-quick-alt"><a href="' . $burl . '#plans">' . T($l, 'biz_plans_btn') . '</a>' . biz_wa_link($l, 'info', 'bz-quick-wa', T($l, 'biz_wa_btn')) . '</p></form>';
    };
    my $hero = sub {
      my ($crumbs, $pill, $h1, $lede, $visual, $what, $form) = @_;
      '<section class="bz-hero"><div class="wrap bz-hero-in"><div class="bz-copy">' . crumbs_html($l, $crumbs) . '<p class="bz-pill"><span class="dot" aria-hidden="true"></span>' . esc($pill) . '</p>'
      . '<h1>' . esc($h1) . '</h1><p class="bz-lede">' . esc($lede) . '</p>' . ($form || $btns->($what)) . $ticks->(qw(biz_tick1 biz_tick2 biz_tick3))
      . qq{</div><div class="bz-visual">$visual</div></div></section>};
    };
    my $head = sub { my ($id, $eyebrow, $title, $sub, $n) = @_; '<div class="bz-head">' . ($eyebrow ? '<p class="bz-eyebrow">' . ($n ? qq{<span class="n" aria-hidden="true">$n</span>} : '') . "$eyebrow</p>" : '') . qq{<h2 id="$id">$title</h2>} . ($sub ? "<p>$sub</p>" : '') . '</div>' };
    my $steps = sub {
      '<ol class="bz-steps">' . join('', map { my $i = $_; my $st = $_[0][$i];
        '<li><span class="bz-num" aria-hidden="true">' . $num->($i + 1) . '</span><h3>' . esc($st->{title}{$l}) . '</h3><p>' . esc($st->{text}{$l}) . '</p></li>' } 0 .. $#{ $_[0] }) . '</ol>';
    };
    my $faq = sub { my ($id, @qa) = @_; my $n = ref $qa[0] ? '' : shift @qa;   # optional section number first
      qq{<section class="bz-sec" id="faq" aria-labelledby="$id"><div class="wrap bz-faq">} . $head->($id, T($l, 'faq_eyebrow'), T($l, 'faq_title'), '', $n) . faq_html(@qa) . '</div></section>' };
    my $toolband = $BIZ->{tool} ? '<div class="bz-toolband"><img src="/img/mascot/didu-point.svg" alt="" width="110" height="110" loading="lazy"><div><h2>' . T($l, 'qr_band_title') . '</h2><p>' . T($l, 'qr_band_text') . '</p></div>'
      . '<a class="bz-btn bz-pri" href="' . path_for($l, '/business/qr-menu-generator/') . '">' . T($l, 'qr_band_btn') . ' ' . icon('arrow', 'flip') . '</a></div>' : '';
    my $cta = '<section class="bz-sec"><div class="wrap"><div class="bz-cta"><div><h2>' . T($l, 'biz_cta_title') . '</h2><p>' . T($l, 'biz_cta_text') . '</p></div><img src="/img/mascot/didu-party.svg" alt="" width="130" height="130" loading="lazy"><a class="bz-btn bz-sunbtn" href="' . $burl . '#join">' . T($l, 'biz_join') . ' ' . icon('arrow', 'flip') . '</a></div></div></section>';

    # the landing page
    {
      my $crumbs = [[T($l, 'home'), path_for($l, '/')], ['Foodidu Business', $burl]];
      my $stage = qq{<div class="bz-anim"><canvas class="biz-anim" data-lang="$l" width="1080" height="1080" role="img" aria-label="} . T($l, 'anim_alt') . '"></canvas>'
        . '<button class="anim-btn" type="button" aria-pressed="false" data-play="' . T($l, 'anim_play') . '" data-pause="' . T($l, 'anim_pause') . '" aria-label="' . T($l, 'anim_play') . '">' . icon('play', 'i-play') . icon('pause', 'i-pause') . '</button><p class="anim-cap" aria-hidden="true"></p></div>';   # the 30 s services explainer (static/js/biz-anim.js); the caption shows the scene title on phones
      # all the services at a glance first (icon beside the name), each opening its details below
      my $glance = '<ul class="bz-glance">' . join('', map { my $s = $_; '<li' . ($s->{featured} ? ' class="main"' : '') . '><a href="#svc-' . $s->{key} . '"><span class="bz-ic">' . icon($s->{icon}) . '</span>'
        . '<span class="t"><b>' . esc($s->{name}{$l}) . '</b><small>' . esc($s->{short}{$l}) . '</small></span>' . icon('arrow', 'go flip') . '</a></li>' } @svc) . '</ul>';
      my $rows = join '', map { my $s = $_; my $k = $row_mock{$s->{key}};
        '<article class="bz-row' . ($s->{featured} ? ' bz-row-main' : '') . '" id="svc-' . $s->{key} . '"><div class="bz-row-copy">' . ($s->{featured} ? '<span class="bz-tag">' . T($l, 'biz_main_tag') . '</span>' : '')
        . '<div class="bz-ttl"><span class="bz-ic">' . icon($s->{icon}) . '</span><h3>' . esc($s->{name}{$l}) . '</h3></div><p>' . esc($s->{short}{$l}) . '</p>'
        . ($s->{features} ? '<ul class="bz-list">' . join('', map { '<li>' . icon('check') . '<span>' . esc($_->{title}{$l}) . '</span></li>' } @{ $s->{features} }[0 .. 2]) . '</ul>' : '')
        . ($s->{highlight} ? '<ul class="bz-new">' . join('', map { '<li><span class="bz-new-tag">' . T($l, 'biz_new') . '</span>' . icon($_->{icon}) . '<span>' . esc($_->{title}{$l}) . '</span></li>' } @{ $s->{highlight}{items} }) . '</ul>' : '')
        . ($has_page->($s) ? '<a class="bz-link" href="' . $surl->($s) . '">' . T($l, 'biz_more') . ': ' . esc($s->{name}{$l}) . ' ' . icon('arrow', 'flip') . '</a>' : '')
        . '</div>' . ($k ? '<div class="bz-row-visual">' . biz_mock($l, $k) . '</div>' : '') . '</article>' } @svc;
      my $plans = '<ul class="bz-plans">' . join('', map { my $p = $_;
        '<li class="bz-plan' . ($p->{featured} ? ' bz-plan-main' : '') . '">' . ($p->{featured} ? '<span class="bz-tag">' . T($l, 'biz_plan_tag') . '</span>' : '')
        . '<h3>' . esc($p->{name}{$l}) . '</h3><p class="bz-price">' . esc($p->{price}{$l}) . '</p><p class="bz-note">' . esc($p->{note}{$l}) . '</p>'
        . '<ul class="bz-list">' . join('', map { '<li>' . icon('check') . '<span>' . esc($_->{$l}) . '</span></li>' } @{ $p->{features} }) . '</ul>'
        . '<a class="bz-btn ' . ($p->{featured} ? 'bz-pri' : 'bz-ghost') . '" href="#join" data-track="business_plan_click" data-plan="' . $p->{key} . '">' . T($l, 'biz_plan_cta') . '</a></li>' } @{ $BIZ->{plans} }) . '</ul>';
      my $req = ' <span class="req" aria-hidden="true">*</span>';
      my $opts = join '', map { qq{<option value="$_->[0]">} . T($l, $_->[1]) . '</option>' } (['restaurant', 'f_restaurant'], ['cafe', 'f_cafe'], ['cloud-kitchen', 'f_cloud'], ['food-truck', 'f_truck'], ['bakery', 'f_bakery'], ['other', 'f_other']);
      my $svc_checks = join '', map { '<label class="check"><input type="checkbox" name="services" value="' . esc($_->{name}{$l}) . '"' . ($_->{featured} ? ' checked' : '') . '><span>' . esc($_->{name}{$l}) . '</span></label>' } @svc;
      my $plan_opts = '<option value="">' . T($l, 'f_plan_ph') . '</option>' . join('', map { '<option value="' . $_->{key} . '">' . esc($_->{name}{$l}) . ' · ' . esc($_->{price}{$l}) . '</option>' } @{ $BIZ->{plans} });
      my @qa = map { [esc($_->{q}{$l}), esc($_->{a}{$l})] } @{ $BIZ->{faq} };
      my $aud = @{ $BIZ->{audiences} // [] } ? '<p class="bz-aud"><span>' . T($l, 'biz_aud_lead') . '</span>' . join('', map { '<a href="' . path_for($l, "/business/$_->{key}/") . '">' . icon($_->{icon}) . esc($_->{name}{$l}) . '</a>' } @{ $BIZ->{audiences} }) . '</p>' : '';
      my $body = $hero->($crumbs, T($l, 'biz_pill'), $BIZ->{h1}{$l}, $BIZ->{lede}{$l}, $stage, undef, $quick->()) . <<"HTML";
<section class="bz-sec" id="services" aria-labelledby="svc-title"><div class="wrap">
@{[ $head->('svc-title', T($l, 'biz_svc_eyebrow'), T($l, 'biz_svc_title'), '', $num->(1)) ]}
$glance
$aud
<div class="bz-rows">$rows</div>
@{[ $toolband ? qq{<div style="margin-top:clamp(44px,7vw,88px)">$toolband</div>} : '' ]}
</div></section>
<section class="bz-sec bz-alt" id="how" aria-labelledby="journey-title"><div class="wrap">
@{[ $head->('journey-title', T($l, 'biz_journey_eyebrow'), esc($BIZ->{journey}{title}{$l}), '', $num->(2)) ]}
@{[ $steps->($BIZ->{journey}{steps}) ]}
</div></section>
<section class="bz-sec" id="plans" aria-labelledby="plans-title"><div class="wrap">
@{[ $head->('plans-title', T($l, 'biz_plans_eyebrow'), T($l, 'biz_plans_title'), T($l, 'biz_plans_sub'), $num->(3)) ]}
$plans
</div></section>
<section class="bz-sec bz-alt" id="join" aria-labelledby="form-title"><div class="wrap bz-join">
<div class="bz-join-copy"><p class="bz-eyebrow"><span class="n" aria-hidden="true">@{[ $num->(4) ]}</span>Foodidu Business</p><h2 id="form-title">@{[ T($l, 'biz_form_title') ]}</h2><p>@{[ T($l, 'biz_form_text') ]}</p>@{[ $ticks->(qw(biz_form_t1 biz_form_t2 biz_form_t3)) ]}@{[ biz_wa_link($l, 'info', 'bz-btn bz-wa', T($l, 'biz_wa_btn')) ]}<img src="/img/mascot/didu.svg" alt="" width="150" height="150" loading="lazy"></div>
<div class="form-card">
<p class="bz-form-sub">@{[ T($l, 'p_form_sub') ]}</p>
<form id="vendor-application-form" novalidate>
<div class="form-grid">
<div class="field"><label for="f-business">@{[ T($l, 'f_business') ]}$req</label><input id="f-business" name="businessName" required maxlength="200" autocomplete="organization"></div>
<div class="field"><label for="f-contact">@{[ T($l, 'f_contact') ]}$req</label><input id="f-contact" name="contactPerson" required maxlength="200" autocomplete="name" pattern="^[\\p{L}\\s\\-]+\$" aria-describedby="f-contact-hint"><span class="hint" id="f-contact-hint">@{[ T($l, 'f_contact_hint') ]}</span></div>
<div class="field"><label for="f-phone">@{[ T($l, 'f_phone') ]}$req</label><input id="f-phone" name="phone" type="tel" required maxlength="40" autocomplete="tel" inputmode="tel"></div>
<div class="field"><label for="f-email">@{[ T($l, 'f_email') ]}$req</label><input id="f-email" name="email" type="email" required maxlength="200" autocomplete="email"></div>
<div class="field"><label for="f-location">@{[ T($l, 'f_location') ]}$req</label><input id="f-location" name="location" required maxlength="300" placeholder="@{[ T($l, 'f_location_ph') ]}"></div>
<div class="field"><label for="f-type">@{[ T($l, 'f_type') ]}$req</label><select id="f-type" name="businessType" required><option value="">@{[ T($l, 'f_type_ph') ]}</option>$opts</select></div>
<fieldset class="field full checks"><legend>@{[ T($l, 'f_services') ]}</legend>$svc_checks</fieldset>
<div class="field full"><label for="f-plan">@{[ T($l, 'f_plan') ]}</label><select id="f-plan" name="plan">$plan_opts</select></div>
<div class="field full"><label for="f-desc">@{[ T($l, 'f_desc') ]}</label><textarea id="f-desc" name="description" maxlength="2500" placeholder="@{[ T($l, 'f_desc_ph') ]}"></textarea></div>
<div class="field full"><label for="f-web">@{[ T($l, 'f_web') ]}</label><input id="f-web" name="website" maxlength="500" inputmode="url" autocomplete="url"></div>
</div>
<div class="form-foot"><button class="bz-btn bz-pri" type="submit">@{[ T($l, 'f_submit') ]}</button><small>@{[ T($l, 'f_privacy') ]} <a href="@{[ path_for($l, '/privacy-policy/') ]}">@{[ T($l, 'privacy') ]}</a></small></div>
<p class="form-status" id="form-status" role="status" tabindex="-1" hidden></p>
</form>
</div>
</div></section>
@{[ $faq->('bfaq-title', $num->(5), @qa) ]}
HTML
      layout(lang => $l, key => '/business/', title => $BIZ->{seo}{$l}{title}, desc => $BIZ->{seo}{$l}{description}, body => $body, skin => 'biz', lastmod => mdate($BIZ_FILE), scripts => [asset('/js/biz-anim.js')],
        crumbs => $crumbs, og => "/img/og/biz-home-$l.png", fd => { formUrl => $FORM_URL, quickNote => ($BIZ->{quick} ? $BIZ->{quick}{note}{$l} : '') },
        ld => [ { '@type' => 'ItemList', name => 'Foodidu Business', itemListElement => [ map { my $i = $_; { '@type' => 'ListItem', position => $i + 1, name => $svc[$i]{name}{$l}, ($has_page->($svc[$i]) ? (url => absu($surl->($svc[$i]))) : ()) } } 0 .. $#svc ] }, faq_ld(@qa) ]);
    }

    # one page per service
    my %hero_mock = ('loyalty-program' => ['card'], 'qr-menu' => ['phone', 'stand'], 'restaurant-website' => ['web'], 'google-maps' => ['maps']);
    for my $s (grep { $has_page->($_) } @svc) {
      my $url = $surl->($s);
      my $crumbs = [[T($l, 'home'), path_for($l, '/')], ['Foodidu Business', $burl], [$s->{name}{$l}, $url]];
      my $m = $hero_mock{$s->{key}};
      my $visual = $m ? '<div class="bz-duo n' . scalar(@$m) . '">' . join('', map { biz_mock($l, $_) } @$m) . '<img class="bz-didu at-start" src="/img/mascot/didu-point.svg" alt="" width="120" height="120"></div>' : '<span class="bz-ic bz-ic-xl">' . icon($s->{icon}) . '</span>';
      my $guide = $s->{guide} ? qq{<section class="bz-sec bz-alt" aria-labelledby="guide-title"><div class="wrap">} . $head->('guide-title', esc($s->{name}{$l}), esc($s->{guide}{title}{$l}), esc($s->{guide}{intro}{$l}))
        . '<ol class="bz-guide">' . join('', map { '<li><h3>' . esc($_->{title}{$l}) . '</h3><p>' . esc($_->{text}{$l}) . '</p></li>' } @{ $s->{guide}{items} }) . '</ol></div></section>' : '';
      my $about = $s->{about} ? qq{<section class="bz-sec" aria-labelledby="about-title"><div class="wrap bz-about"><h2 id="about-title">} . esc($s->{about}{title}{$l}) . '</h2><div>'
        . join('', map { '<p>' . esc($_->{$l}) . '</p>' } @{ $s->{about}{text} }) . '</div></div></section>' : '';
      my $feats = '<ul class="bz-feats">' . join('', map { '<li><div class="bz-ttl"><span class="bz-ic">' . icon('check') . '</span><h3>' . esc($_->{title}{$l}) . '</h3></div><p>' . esc($_->{text}{$l}) . '</p></li>' } @{ $s->{features} }) . '</ul>';
      my $others = '<ul class="bz-cards">' . join('', map { my $o = $_;
        '<li><div class="bz-ttl"><span class="bz-ic">' . icon($o->{icon}) . '</span><h3>' . ($has_page->($o) ? '<a href="' . $surl->($o) . '">' . esc($o->{name}{$l}) . '</a>' : esc($o->{name}{$l})) . '</h3></div><p>' . esc($o->{short}{$l}) . '</p></li>' } grep { $_ ne $s } @svc) . '</ul>';
      # the newest features, first and marked "new"
      my $hl = $s->{highlight} ? '<div class="bz-hl">' . $head->('hl-title', T($l, 'biz_new'), esc($s->{highlight}{title}{$l}), esc($s->{highlight}{intro}{$l}))
        . '<ul class="bz-feats">' . join('', map { '<li><span class="bz-tag">' . T($l, 'biz_new') . '</span><div class="bz-ttl"><span class="bz-ic">' . icon($_->{icon}) . '</span><h3>' . esc($_->{title}{$l}) . '</h3></div><p>' . esc($_->{text}{$l}) . '</p></li>' } @{ $s->{highlight}{items} }) . '</ul>'
        . '<p class="bz-hl-cta">' . biz_wa_link($l, 'menu', 'bz-btn bz-wa', esc($s->{highlight}{cta}{$l})) . '</p></div>' : '';
      my @qa = map { [esc($_->{q}{$l}), esc($_->{a}{$l})] } @{ $s->{faq} };
      my $band = $s->{key} eq 'qr-menu' && $toolband ? qq{<section class="bz-sec" style="padding-top:0"><div class="wrap">$toolband</div></section>} : '';
      my $body = $hero->($crumbs, $s->{name}{$l}, $s->{h1}{$l}, $s->{lede}{$l}, $visual, { 'google-maps' => 'maps', 'qr-menu' => 'menu' }->{$s->{key}}) . $about . $guide . $band . <<"HTML";
<section class="bz-sec bz-alt" aria-labelledby="feat-title"><div class="wrap">
$hl
@{[ $head->('feat-title', esc($s->{name}{$l}), T($l, 'biz_feats_title')) ]}
$feats
</div></section>
<section class="bz-sec" aria-labelledby="how-title"><div class="wrap">
@{[ $head->('how-title', '', T($l, 'biz_how_title')) ]}
@{[ $steps->($s->{steps}) ]}
</div></section>
$cta
<section class="bz-sec bz-alt" aria-labelledby="more-title"><div class="wrap">
@{[ $head->('more-title', 'Foodidu Business', T($l, 'biz_other_title')) ]}
$others
</div></section>
@{[ $faq->('sfaq-title', @qa) ]}
HTML
      my $t = $s->{seo}{$l}{title};
      layout(lang => $l, key => "/business/$s->{key}/", title => (length($t) + 10 <= 65 ? "$t | Foodidu" : $t), desc => $s->{seo}{$l}{description}, body => $body, skin => 'biz', lastmod => mdate($BIZ_FILE),
        crumbs => $crumbs, og => "/img/og/biz-$s->{key}-$l.png",
        ld => [ { '@type' => 'Service', name => $s->{name}{$l}, serviceType => $s->{name}{en}, description => $s->{seo}{$l}{description}, url => absu($url),
          provider => { '@id' => "$SITE/business/#org" }, areaServed => { '@type' => 'Country', name => 'Egypt' } }, faq_ld(@qa) ]);
    }

    # one page per kind of place (cafés, cloud kitchens): what is different about it and which services fit, with the quick form
    my %svc_by = map { ($_->{key} => $_) } @svc;
    my %aud_type = (cafes => 'cafe', 'cloud-kitchens' => 'cloud-kitchen');   # the form's businessType values
    for my $au (@{ $BIZ->{audiences} // [] }) {
      my $url = path_for($l, "/business/$au->{key}/");
      my $crumbs = [[T($l, 'home'), path_for($l, '/')], ['Foodidu Business', $burl], [$au->{name}{$l}, $url]];
      my $visual = '<div class="bz-duo n' . scalar(@{ $au->{visual} }) . '">' . join('', map { biz_mock($l, $_) } @{ $au->{visual} }) . '<img class="bz-didu at-start" src="/img/mascot/didu-point.svg" alt="" width="120" height="120"></div>';
      my $why = qq{<section class="bz-sec" aria-labelledby="why-title"><div class="wrap">} . $head->('why-title', esc($au->{name}{$l}), esc($au->{why}{title}{$l}))
        . '<ol class="bz-guide two">' . join('', map { '<li><h3>' . esc($_->{title}{$l}) . '</h3><p>' . esc($_->{text}{$l}) . '</p></li>' } @{ $au->{why}{items} }) . '</ol></div></section>';
      my $tools = '<ul class="bz-cards">' . join('', map { my $o = $svc_by{$_->{service}} or die "audience $au->{key}: no service $_->{service}\n";
        '<li><div class="bz-ttl"><span class="bz-ic">' . icon($o->{icon}) . '</span><h3>' . ($has_page->($o) ? '<a href="' . $surl->($o) . '">' . esc($o->{name}{$l}) . '</a>' : esc($o->{name}{$l})) . '</h3></div><p>' . esc($_->{text}{$l}) . '</p></li>' } @{ $au->{tools} }) . '</ul>';
      my $more = '<ul class="bz-cards">' . join('', map { '<li><div class="bz-ttl"><span class="bz-ic">' . icon($_->{icon}) . '</span><h3><a href="' . path_for($l, "/business/$_->{key}/") . '">' . esc($_->{name}{$l}) . '</a></h3></div><p>' . esc($_->{seo}{$l}{description}) . '</p></li>' } grep { $_ ne $au } @{ $BIZ->{audiences} })
        . '<li><div class="bz-ttl"><span class="bz-ic">' . icon('store') . '</span><h3><a href="' . $burl . '#services">' . T($l, 'biz_all_svc') . '</a></h3></div><p>' . esc($BIZ->{seo}{$l}{description}) . '</p></li></ul>';
      my @qa = map { [esc($_->{q}{$l}), esc($_->{a}{$l})] } @{ $au->{faq} };
      my $band = $au->{key} eq 'cafes' && $toolband ? qq{<section class="bz-sec" style="padding-top:0"><div class="wrap">$toolband</div></section>} : '';
      my $body = $hero->($crumbs, $au->{name}{$l}, $au->{h1}{$l}, $au->{lede}{$l}, $visual, undef, $quick->($aud_type{$au->{key}})) . $why . <<"HTML" . $band . $cta . <<"HTML2";
<section class="bz-sec bz-alt" aria-labelledby="tools-title"><div class="wrap">
@{[ $head->('tools-title', esc($au->{name}{$l}), T($l, 'biz_aud_tools')) ]}
$tools
</div></section>
HTML
<section class="bz-sec bz-alt" aria-labelledby="more-title"><div class="wrap">
@{[ $head->('more-title', 'Foodidu Business', T($l, 'biz_aud_more')) ]}
$more
</div></section>
@{[ $faq->('afaq-title', @qa) ]}
HTML2
      layout(lang => $l, key => "/business/$au->{key}/", title => $au->{seo}{$l}{title}, desc => $au->{seo}{$l}{description}, body => $body, skin => 'biz', lastmod => mdate($BIZ_FILE),
        crumbs => $crumbs, og => "/img/og/biz-home-$l.png", fd => { formUrl => $FORM_URL, quickNote => ($BIZ->{quick} ? $BIZ->{quick}{note}{$l} : '') },
        ld => [ { '@type' => 'Service', name => "Foodidu Business " . ($l eq 'en' ? lcfirst $au->{name}{$l} : $au->{name}{$l}), serviceType => 'Restaurant marketing', description => $au->{seo}{$l}{description}, url => absu($url),
          audience => { '@type' => 'BusinessAudience', audienceType => $au->{name}{en} =~ s/^For //r }, provider => { '@id' => "$SITE/business/#org" }, areaServed => { '@type' => 'Country', name => 'Egypt' } }, faq_ld(@qa) ]);
    }

    # the free QR code tool: the restaurant pastes its menu link and gets a code + a table card (static/js/qr.js and qr-tool.js, all in the browser)
    if (my $tl = $BIZ->{tool}) {
      my $turl = path_for($l, '/business/qr-menu-generator/');
      my $crumbs = [[T($l, 'home'), path_for($l, '/')], ['Foodidu Business', $burl], [$tl->{name}{$l}, $turl]];
      my @colors = (['#3A280D', 'qr_c_brown'], ['#111111', 'qr_c_black'], ['#2F5310', 'qr_c_green'], ['#B42318', 'qr_c_red'], ['#1D4ED8', 'qr_c_blue']);
      my $colors = join '', map { my $i = $_; '<label style="background:' . $colors[$i][0] . '" title="' . T($l, $colors[$i][1]) . '"><input type="radio" name="qr-color" value="' . $colors[$i][0] . '"' . ($i == 0 ? ' checked' : '') . '><span class="sr-only">' . T($l, $colors[$i][1]) . '</span></label>' } 0 .. $#colors;
      my $tips = '<ul class="bz-feats">' . join('', map { '<li><div class="bz-ttl"><span class="bz-ic">' . icon('check') . '</span><h3>' . esc($_->{title}{$l}) . '</h3></div><p>' . esc($_->{text}{$l}) . '</p></li>' } @{ $tl->{tips} }) . '</ul>';
      my @qa = map { [esc($_->{q}{$l}), esc($_->{a}{$l})] } @{ $tl->{faq} };
      my $req = ' <span class="req" aria-hidden="true">*</span>';
      # Premium: the card in the restaurant's own design, made by the team (the free tool keeps everything it has)
      my $pr = $tl->{premium};
      my $pcard = sub { my ($p, $main, $btn) = @_;
        '<li class="bz-plan' . ($main ? ' bz-plan-main' : '') . '">' . ($p->{tag} ? '<span class="bz-tag">' . esc($p->{tag}{$l}) . '</span>' : '') . '<h3>' . esc($p->{name}{$l}) . '</h3><p class="bz-price">' . esc($p->{price}{$l}) . '</p><p class="bz-note">' . esc($p->{note}{$l}) . '</p>'
        . '<ul class="bz-list">' . join('', map { '<li>' . icon('check') . '<span>' . esc($_->{$l}) . '</span></li>' } @{ $p->{items} }) . "</ul>$btn</li>" };
      my $premium = $pr ? qq{<section class="bz-sec" id="premium" aria-labelledby="pro-title"><div class="wrap">} . $head->('pro-title', 'QR Premium', esc($pr->{title}{$l}), esc($pr->{intro}{$l}))
        . '<ul class="bz-plans two">' . $pcard->($pr->{free}, 0, '<a class="bz-btn bz-ghost" href="#qr-form">' . esc($pr->{free}{cta}{$l}) . '</a>')
        . $pcard->($pr->{pro}, 1, biz_wa_link($l, 'qrpro', 'bz-btn bz-wa', esc($pr->{pro}{cta}{$l}))) . '</ul></div></section>' : '';
      my $mini = $pr ? '<a class="qr-pro-mini" href="#premium"><span class="bz-new-tag">Premium</span><span>' . esc($pr->{mini}{$l}) . '</span>' . icon('arrow', 'flip') . '</a>' : '';
      my $body = <<"HTML";
<section class="bz-hero qr-page" aria-labelledby="qr-h1">
<div class="wrap qr-head">@{[ crumbs_html($l, $crumbs) ]}<p class="bz-pill"><span class="dot" aria-hidden="true"></span>@{[ T($l, 'qr_pill') ]}</p><h1 id="qr-h1">@{[ esc($tl->{h1}{$l}) ]}</h1><p class="bz-lede">@{[ esc($tl->{lede}{$l}) ]}</p></div>
<div class="wrap qr-tool">
<form class="qr-form" id="qr-form" novalidate>
<div class="field"><label for="qr-url">@{[ T($l, 'qr_link') ]}$req</label><input id="qr-url" type="text" dir="ltr" inputmode="url" autocapitalize="off" spellcheck="false" autocomplete="url" placeholder="https://" maxlength="400" required aria-describedby="qr-url-hint"><span class="hint" id="qr-url-hint">@{[ T($l, 'qr_link_hint') ]}</span>@{[ biz_wa($l, 'menu') ? '<p class="qr-nomenu">' . icon('whatsapp') . '<span>' . T($l, 'qr_nomenu', wa => biz_wa($l, 'menu')) . '</span></p>' : '' ]}<p class="qr-err" id="qr-url-err" role="alert" hidden></p></div>
<div class="qr-row"><div class="field"><label for="qr-name">@{[ T($l, 'qr_name') ]}</label><input id="qr-name" maxlength="40" autocomplete="organization" placeholder="@{[ T($l, 'qr_name_ph') ]}"></div>
<div class="field"><label for="qr-table">@{[ T($l, 'qr_table') ]}</label><input id="qr-table" maxlength="6" inputmode="numeric" placeholder="7"></div></div>
<div class="field"><label for="qr-text">@{[ T($l, 'qr_text') ]}</label><input id="qr-text" maxlength="50" value="@{[ T($l, 'qr_text_def') ]}"></div>
<fieldset class="qr-opts"><legend>@{[ T($l, 'qr_style') ]}</legend><div class="qr-styles"><label><input type="radio" name="qr-style" value="sun" checked><span class="sw" style="background:#FFD15C"></span>@{[ T($l, 'qr_style_sun') ]}</label><label><input type="radio" name="qr-style" value="white"><span class="sw" style="background:#fff"></span>@{[ T($l, 'qr_style_white') ]}</label></div></fieldset>
<fieldset class="qr-opts"><legend>@{[ T($l, 'qr_color') ]}</legend><div class="qr-colors">$colors</div></fieldset>
<label class="qr-check"><input type="checkbox" id="qr-didu" checked>@{[ T($l, 'qr_didu') ]}</label>
<label class="qr-check"><input type="checkbox" id="qr-credit" checked>@{[ T($l, 'qr_credit') ]}</label>
</form>
<div class="qr-side">
<div class="qr-preview"><span>@{[ T($l, 'qr_preview') ]}</span><div class="qr-card" id="qr-card"><img src="/img/biz/qr-$l.svg" alt="@{[ T($l, 'qr_sample_alt') ]}" width="330" height="330"></div></div>
<p class="qr-note" id="qr-note" aria-live="polite">@{[ T($l, 'qr_sample') ]}</p>
<div class="qr-actions"><button class="bz-btn bz-pri" type="button" id="qr-dl-card" disabled>@{[ icon('download') ]} @{[ T($l, 'qr_dl_card') ]}</button>
<div class="row"><button class="bz-btn bz-ghost" type="button" id="qr-dl-code" disabled>@{[ T($l, 'qr_dl_code') ]}</button><button class="bz-btn bz-ghost" type="button" id="qr-print" disabled>@{[ icon('print') ]} @{[ T($l, 'qr_print') ]}</button></div></div>
$mini
<p class="qr-private">@{[ icon('shield') ]}<span>@{[ T($l, 'qr_private') ]}</span></p>
</div>
</div>
</section>
$premium
<section class="bz-sec bz-alt" aria-labelledby="how-title"><div class="wrap">
@{[ $head->('how-title', esc($tl->{name}{$l}), T($l, 'qr_how_title')) ]}
@{[ $steps->($tl->{steps}) ]}
</div></section>
@{[ $tl->{uses} ? qq{<section class="bz-sec" aria-labelledby="uses-title"><div class="wrap">} . $head->('uses-title', '', esc($tl->{uses}{title}{$l}))
  . '<ul class="bz-feats">' . join('', map { '<li><div class="bz-ttl"><span class="bz-ic">' . icon('qr') . '</span><h3>' . esc($_->{title}{$l}) . '</h3></div><p>' . esc($_->{text}{$l}) . '</p></li>' } @{ $tl->{uses}{items} }) . '</ul></div></section>' : '' ]}
<section class="bz-sec bz-alt" aria-labelledby="tips-title"><div class="wrap">
@{[ $head->('tips-title', '', T($l, 'qr_tips_title')) ]}
$tips
</div></section>
<section class="bz-sec"><div class="wrap"><div class="bz-cta"><div><h2>@{[ T($l, 'qr_up_title') ]}</h2><p>@{[ T($l, 'qr_up_text') ]}</p></div><img src="/img/mascot/didu-party.svg" alt="" width="130" height="130" loading="lazy"><a class="bz-btn bz-sunbtn" href="@{[ path_for($l, '/business/qr-menu/') ]}">@{[ T($l, 'qr_up_btn') ]} @{[ icon('arrow', 'flip') ]}</a></div></div></section>
@{[ $faq->('tfaq-title', @qa) ]}
HTML
      my %qrt = map { ($_ => T($l, "qr_js_$_")) } qw(word table bad long sample ready credit);
      layout(lang => $l, key => '/business/qr-menu-generator/', title => $tl->{seo}{$l}{title}, desc => $tl->{seo}{$l}{description}, body => $body, skin => 'biz', lastmod => mdate($BIZ_FILE),
        crumbs => $crumbs, og => "/img/og/biz-qr-menu-generator-$l.png", fd => { qr => { %qrt, namePh => T($l, 'qr_name_ph') } }, scripts => [asset('/js/qr.js'), asset('/js/qr-tool.js')],
        ld => [ { '@type' => 'WebApplication', name => $tl->{name}{$l}, url => absu($turl), description => $tl->{seo}{$l}{description}, applicationCategory => 'BusinessApplication', operatingSystem => 'Any',
          browserRequirements => 'Requires JavaScript', isAccessibleForFree => JSON::PP::true, offers => { '@type' => 'Offer', price => '0', priceCurrency => 'EGP' }, provider => { '@id' => "$SITE/business/#org" } }, faq_ld(@qa) ]);
    }
  }

  # ---------- legal
  for my $doc (['privacy-policy', 'privacy', 'pr'], ['terms-and-conditions', 'terms', 'te']) {
    my ($slug, $file, $p) = @$doc;
    my $src = "$ROOT/content/$file.$l.html";
    my $content = slurp($src);
    $content =~ s/\{privacy\}/path_for($l, '\/privacy-policy\/')/ge;
    my $crumbs = [[T($l, 'home'), path_for($l, '/')], [T($l, "${p}_title"), path_for($l, "/$slug/")]];
    my $body = qq{<section class="page-hero"><div class="wrap">} . crumbs_html($l, $crumbs) . '<h1>' . T($l, "${p}_title") . '</h1><p class="updated">'
      . T($l, 'updated', date => ($l eq 'en' ? 'October 2026' : 'أكتوبر 2026')) . qq{</p></div></section><div class="scallop" aria-hidden="true"></div><div class="wrap legal">$content</div>};
    layout(lang => $l, key => "/$slug/", title => T($l, "${p}_seo"), desc => T($l, "${p}_desc"), body => $body, crumbs => $crumbs, lastmod => mdate($src));
  }
}

# ---------- 404 (bilingual, noindex)
{
  my $body = <<"HTML";
<section class="wrap lost">
<img class="didu" src="/img/mascot/didu-search.svg" alt="" width="220" height="220">
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
  my ($measurement) = slurp("$ROOT/static/js/site.js") =~ /GA_ID = "([^"]+)"/;
  my @codes = map { my $b = $_; map { +{
      brand => $b->{name}{ar}, brandEn => $b->{name}{en}, key => $b->{key}, code => ($_->{noCode} ? 'بدون كود' : $_->{code}), offer => $_->{offer}{ar},
      category => $CATN{ $b->{category} }{ar}, region => strip_tags(region_label($b, 'ar')),
      exclusive => ($_->{exclusive} ? $T : $F), low => (($b->{priority} // '') eq 'low' ? $T : $F),
      checked => $_->{lastVerified}, page => brand_url($b, 'ar'), pageEn => brand_url($b, 'en') } } offers_of($b) } @BRANDS;
  my @rests = map { +{ key => $_->{key}, name => $_->{name}{ar}, offers => scalar(@{ $_->{offers} }), min => rest_min($_), save => rest_max_save($_),
      until => $_->{validUntil}, checked => $_->{lastChecked}, page => rest_url($_, 'ar'), pageEn => rest_url($_, 'en'), nameEn => $_->{name}{en}, menu => $_->{menu}{ar} // $_->{website} } } @RESTS;
  my @deals = map { my $d = $_; my $b = dd_brand($d) // dd_rest($d); +{ name => ($b ? $b->{name}{ar} : $d->{name}{ar}), title => $d->{title}{ar},
      days => [ map { $DAYN{ar}{$_} } @{ $d->{days} } ], checked => $d->{lastChecked}, source => $d->{source} } } @DDEALS;
  my @fps = grep { $_->[1] } map { my $k = $_; my ($r) = grep { $_->{key} eq $k } @RESTS; [$r, $r // $BYKEY{$k}] } feat_keys();   # [restaurant, partner]
  my ($fr, $fp) = @{ $fps[0] // [] };
  my %data = (
    built => (sort { $b cmp $a } $DATA_DATE, $RO_DATE, $DD_DATE, mdate($FT_FILE))[0],   # newest data file's date: stable between builds
    site => $SITE, pages => scalar(@PAGES),
    codes => \@codes, restaurants => \@rests, deals => \@deals,
    featured => ($fp ? { active => ($FEAT->{active} ? $T : $F), partner => join('، ', map { $_->[1]{name}{ar} } @fps), until => $FEAT->{until}, sponsored => ($FEAT->{sponsored} ? $T : $F),
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
