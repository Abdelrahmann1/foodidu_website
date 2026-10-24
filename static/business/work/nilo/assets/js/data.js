/* NILO gelato — shared content in English and Arabic. */
window.NILO_DATA = (() => {
  const L = document.documentElement.lang === 'ar' ? 'ar' : 'en';
  const t = (v) => (v && typeof v === 'object' ? v[L] : v);

  // base: 'milk' or 'sorbet'; cairo: a Cairo special; isNew: new this season
  const FLAVORS = [
    { key: 'mango', base: 'sorbet', cairo: true, isNew: true, bg: '#FFB627', contains: [],
      name: { en: 'Mango Ewais', ar: 'مانجا عويس' }, tag: { en: 'New', ar: 'جديد' },
      short: { en: 'Ewais mango and nothing else.', ar: 'مانجا عويس ومفيش غيرها.' },
      long: { en: 'Ewais mangoes from Ismailia, peeled and churned within hours. No milk, no added color, just a lot of mango.', ar: 'مانجا عويس من الإسماعيلية، بتتقشر وتتخفق في نفس الساعات. من غير لبن ولا ألوان، مانجا وبس، كتير.' } },
    { key: 'roz', base: 'milk', cairo: true, bg: '#FFD9C7', contains: ['milk'],
      name: { en: 'Roz bel Laban', ar: 'رز بلبن' }, tag: { en: 'Classic', ar: 'كلاسيك' },
      short: { en: 'Rice pudding, orange blossom, cinnamon.', ar: 'رز بلبن، ماء زهر، قرفة.' },
      long: { en: 'Short-grain rice cooked slowly in milk with orange-blossom water and a dusting of cinnamon. It tastes like a Friday afternoon.', ar: 'رز قصير الحبة متسوّي على مهله في اللبن، مع ماء زهر وقرفة على الوش. طعمه زي عصرية يوم الجمعة.' } },
    { key: 'pistachio', base: 'milk', bg: '#B5CF6B', contains: ['milk', 'nuts'],
      name: { en: 'Pistachio', ar: 'فستق' }, tag: { en: 'Fan fave', ar: 'المفضّل' },
      short: { en: 'Roasted, salted, properly green.', ar: 'محمّص، مملّح، وأخضر بجد.' },
      long: { en: 'Roasted pistachio paste, a pinch of sea salt and whole milk. The color comes from the nuts, not from a bottle.', ar: 'عجينة فستق محمّص، رشة ملح بحري ولبن كامل الدسم. اللون من الفستق نفسه مش من إزازة.' } },
    { key: 'karkadeh', base: 'sorbet', cairo: true, bg: '#FF8FA3', contains: [],
      name: { en: 'Karkadeh Sorbet', ar: 'سوربيه كركديه' }, tag: { en: 'Vegan', ar: 'نباتي' },
      short: { en: 'Hibiscus and lime sorbet.', ar: 'سوربيه كركديه بالليمون.' },
      long: { en: 'Aswan hibiscus steeped overnight, a squeeze of lime and a little cane sugar. Tart, ruby red and very cold.', ar: 'كركديه أسواني منقوع طول الليل، عصرة ليمون وشوية سكر قصب. حامض، أحمر ياقوتي، وساقع جدًا.' } },
    { key: 'chocolate', base: 'milk', bg: '#FFD9C7', contains: ['milk'],
      name: { en: 'Dark Chocolate', ar: 'شوكولاتة دارك' }, tag: { en: 'Classic', ar: 'كلاسيك' },
      short: { en: '70% dark, dense and deep.', ar: '70% كاكاو، تقيلة وغامقة.' },
      long: { en: '70% dark chocolate melted into milk with a pinch of salt. Dense, deep and not too sweet.', ar: 'شوكولاتة دارك 70% مدوّبة في اللبن مع رشة ملح. تقيلة وغامقة ومش مسكّرة أوي.' } },
    { key: 'fior', base: 'milk', bg: '#FFF3E3', contains: ['milk'],
      name: { en: 'Fior di Latte', ar: 'فيور دي لاتيه' }, tag: { en: 'Classic', ar: 'كلاسيك' },
      short: { en: 'Sweet milk. The purist pick.', ar: 'لبن مسكّر. اختيار الأصليين.' },
      long: { en: 'Just whole milk, cream and sugar. The quiet one that everyone ends up ordering twice.', ar: 'لبن كامل وكريمة وسكر وبس. الهادية اللي الكل بيطلبها مرتين.' } },
    { key: 'strawberry', base: 'milk', bg: '#FF8FA3', contains: ['milk'],
      name: { en: 'Strawberry Rose', ar: 'فراولة بالورد' }, tag: { en: 'Seasonal', ar: 'موسمي' },
      short: { en: 'Strawberries with a hint of rose.', ar: 'فراولة بلمسة ورد.' },
      long: { en: 'Winter strawberries from Qalyubia with a drop of rose water. Only around while the berries are.', ar: 'فراولة الشتا من القليوبية بنقطة ماء ورد. موجودة بس طول ما الفراولة موجودة.' } },
    { key: 'guava', base: 'sorbet', cairo: true, bg: '#B5CF6B', contains: [],
      name: { en: 'Guava', ar: 'جوافة' }, tag: { en: 'Vegan', ar: 'نباتي' },
      short: { en: 'Pink guava sorbet, seeds out.', ar: 'سوربيه جوافة من غير بذر.' },
      long: { en: 'Pink guava pressed and strained twice so it stays smooth: seeds out, all the perfume in.', ar: 'جوافة بمبي معصورة ومتصفّية مرتين عشان تبقى ناعمة: البذر برّه والريحة كلها جوّه.' } },
    { key: 'coffee', base: 'milk', cairo: true, bg: '#FFD9C7', contains: ['milk'],
      name: { en: 'Turkish Coffee', ar: 'قهوة تركي' }, tag: { en: 'Grown-up', ar: 'للكبار' },
      short: { en: 'Turkish coffee with cardamom.', ar: 'قهوة تركي بالحبهان.' },
      long: { en: 'Turkish coffee ground fine with cardamom, brewed strong and folded into sweet cream.', ar: 'قهوة تركي مطحونة ناعم بالحبهان، متعملة تقيلة ومتقلّبة في كريمة مسكّرة.' } },
    { key: 'dates', base: 'milk', cairo: true, isNew: true, bg: '#FFB627', contains: ['milk', 'sesame'],
      name: { en: 'Dates & Tahini', ar: 'بلح وطحينة' }, tag: { en: 'New', ar: 'جديد' },
      short: { en: 'Siwa dates swirled with tahini.', ar: 'بلح سيوي ملفوف بالطحينة.' },
      long: { en: 'Siwa dates cooked down into a caramel and rippled with toasted tahini.', ar: 'بلح سيوي متسوّي لحد ما يبقى كراميل، ومتموّج بطحينة محمّصة.' } },
    { key: 'lemonmint', base: 'sorbet', bg: '#B5CF6B', contains: [],
      name: { en: 'Lemon Mint', ar: 'ليمون بالنعناع' }, tag: { en: 'Vegan', ar: 'نباتي' },
      short: { en: 'Lemon and fresh mint, very cold.', ar: 'ليمون ونعناع فريش، ساقع جدًا.' },
      long: { en: 'Baladi lemons and a whole bunch of fresh mint. The closest thing to a fan you can eat.', ar: 'ليمون بلدي وحزمة نعناع فريش كاملة. أقرب حاجة لمروحة تتاكل.' } },
    { key: 'cookies', base: 'milk', bg: '#FF8FA3', contains: ['milk', 'gluten'],
      name: { en: 'Cookies & Cream', ar: 'كوكيز آند كريم' }, tag: { en: 'Kids fave', ar: 'للأطفال' },
      short: { en: 'Vanilla with cocoa cookie crumbs.', ar: 'فانيليا بفتات كوكيز الكاكاو.' },
      long: { en: 'Vanilla-bean gelato with crushed cocoa cookies. Kids love it, adults steal it.', ar: 'جيلاتو فانيليا بفتات كوكيز كاكاو. الأطفال بيحبوه والكبار بيسرقوه.' } },
  ];

  // open/close are hours of the day; a close past midnight is written as 24 + hour
  const LOCATIONS = [
    { key: 'zamalek', num: 1, c: '#FFB627', open: 12, close: 25, map: [287, 214], q: 'Zamalek, Cairo',
      name: { en: 'Zamalek', ar: 'الزمالك' }, kind: { en: 'The flagship', ar: 'الفرع الرئيسي' },
      blurb: { en: 'The copper churn sits in the window and a dozen stools line the pavement. Every batch starts here.', ar: 'ماكينة النحاس في الفاترينة وفيه 12 كرسي على الرصيف. كل دفعة بتبدأ من هنا.' },
      feats: ['seats', 'delivery', 'pints'], phone: '+20 100 000 0001' },
    { key: 'maadi', num: 2, c: '#FF8FA3', open: 13, close: 24, map: [352, 418], q: 'Maadi, Cairo',
      name: { en: 'Maadi', ar: 'المعادي' }, kind: { en: 'The corner shop', ar: 'محل الناصية' },
      blurb: { en: 'A green corner under a big banyan tree, with a small garden for slow evenings and slower scoops.', ar: 'ناصية خضرا تحت شجرة كبيرة، وجنينة صغيرة للسهرات الهادية والسكوبات الأهدى.' },
      feats: ['seats', 'garden', 'delivery'], phone: '+20 100 000 0002' },
    { key: 'newcairo', num: 3, c: '#B5CF6B', open: 16, close: 25, map: [528, 300], q: 'New Cairo',
      name: { en: 'New Cairo', ar: 'التجمع' }, kind: { en: 'The garden kiosk', ar: 'كشك الجنينة' },
      blurb: { en: 'A tiny kiosk in the middle of a park. Grab a cone and walk it off, or call ahead for pints.', ar: 'كشك صغير في نص جنينة. خد كون واتمشّى بيه، أو كلّمنا قبلها وخد علب.' },
      feats: ['takeaway', 'delivery', 'pints'], phone: '+20 100 000 0003' },
    { key: 'sahel', num: 4, c: '#FFD9C7', open: 17, close: 26, months: [6, 7, 8, 9], map: [96, 92], q: 'North Coast, Egypt',
      name: { en: 'North Coast', ar: 'الساحل' }, kind: { en: 'The summer cart', ar: 'عربية الصيف' },
      blurb: { en: 'The cart moves to the beach from June to September. Follow us to see which bay it is parked at this week.', ar: 'العربية بتنزل البحر من يونيو لسبتمبر. تابعنا عشان تعرف راكنة في أنهي خليج الأسبوع ده.' },
      feats: ['beach', 'cart', 'seasonal'], phone: '+20 100 000 0004' },
  ];

  const FEATS = {
    seats: { en: 'Seating', ar: 'قعدة' }, delivery: { en: 'Delivery', ar: 'توصيل' }, pints: { en: 'Pints to go', ar: 'علب تيك أواي' },
    garden: { en: 'Garden', ar: 'جنينة' }, takeaway: { en: 'Takeaway', ar: 'تيك أواي' }, beach: { en: 'On the beach', ar: 'على البحر' },
    cart: { en: 'Gelato cart', ar: 'عربية جيلاتو' }, seasonal: { en: 'Summer only', ar: 'الصيف بس' },
  };
  const CONTAINS = { milk: { en: 'Milk', ar: 'لبن' }, nuts: { en: 'Nuts', ar: 'مكسرات' }, sesame: { en: 'Sesame', ar: 'سمسم' }, gluten: { en: 'Gluten', ar: 'جلوتين' } };

  const UI = {
    en: {
      menu: 'Menu', close: 'Close', openAria: 'Open menu', closeAria: 'Close menu',
      ok: "Thanks! This showcase copy of the site does not send emails.", bad: 'That email looks a little melted. Try again?',
      filters: { all: 'All', milk: 'Creamy', sorbet: 'Dairy-free', cairo: 'Cairo specials', isNew: 'New' },
      more: 'Details', contains: 'Contains', dairyFree: 'Dairy-free', order: 'Order a scoop', closeDlg: 'Close', count: (n) => `${n} flavors`,
      openNow: 'Open now', opensAt: (h) => `Opens at ${h}`, showMap: 'On the map', backIn: 'Back in June', daily: 'Daily', hours: 'Hours', call: 'Call', area: 'Area', directions: 'Directions',
      hour: (h) => { h %= 24; return `${((h + 11) % 12) + 1}${h < 12 ? 'am' : 'pm'}`; },
      summer: 'June – September',
    },
    ar: {
      menu: 'المنيو', close: 'اقفل', openAria: 'افتح المنيو', closeAria: 'اقفل المنيو',
      ok: 'شكراً! النسخة دي من الموقع للعرض ومبتبعتش إيميلات.', bad: 'الإيميل ده شكله ساح شوية. جرّب تاني؟',
      filters: { all: 'الكل', milk: 'بالكريمة', sorbet: 'من غير لبن', cairo: 'قاهري', isNew: 'جديد' },
      more: 'التفاصيل', contains: 'فيه', dairyFree: 'من غير لبن', order: 'اطلب سكوب', closeDlg: 'اقفل', count: (n) => `${n} نكهة`,
      openNow: 'مفتوح دلوقتي', opensAt: (h) => `بيفتح ${h}`, showMap: 'على الخريطة', backIn: 'راجعين في يونيو', daily: 'يوميًا', hours: 'المواعيد', call: 'اتصل', area: 'المنطقة', directions: 'الاتجاهات',
      hour: (h) => { h %= 24; const n = ((h + 11) % 12) + 1; return `${n} ${h < 5 ? 'بالليل' : h < 12 ? 'الصبح' : h < 15 ? 'الضهر' : h < 18 ? 'العصر' : 'بالليل'}`; },
      summer: 'من يونيو لسبتمبر',
    },
  }[L];

  return { L, AR: L === 'ar', t, FLAVORS, LOCATIONS, FEATS, CONTAINS, UI };
})();
