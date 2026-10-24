/* TALG — ice cream bars from Cairo. A website by Foodidu Business. Content in English and Arabic. */
window.TALG_DATA = (() => {
  const L = document.documentElement.lang === 'ar' ? 'ar' : 'en';
  const t = (v) => (v && typeof v === 'object' ? v[L] : v);

  // bar art: inner = the ice cream, coat = dip colour (null = sorbet, no dip), top = topping kind
  const BARS = [
    { key: 'mango', price: 75, weight: 85, inner: '#FFB733', coat: '#FFF4DD', top: 'flakes', topCol: '#F6E7C4', tag: 'best',
      name: { en: 'Mango Ewais', ar: 'مانجا عويس' },
      desc: { en: 'Ewais mango sorbet dipped in white chocolate.', ar: 'سوربيه مانجا عويس متغطّسة في شوكولاتة بيضا.' } },
    { key: 'pistachio', price: 85, weight: 85, inner: '#BFD38A', coat: '#3B2219', top: 'nuts', topCol: '#9DBB55',
      name: { en: 'Pistachio Crunch', ar: 'فستق كرانش' },
      desc: { en: 'Pistachio gelato, dark chocolate, crushed pistachios.', ar: 'جيلاتو فستق، شوكولاتة دارك، وفستق مكسّر.' } },
    { key: 'omali', price: 80, weight: 90, inner: '#F1D9A8', coat: '#7A4A2E', top: 'flakes', topCol: '#FFF1D6', soldOut: 'alex',
      name: { en: 'Om Ali', ar: 'أم علي' },
      desc: { en: 'Milk, puff pastry crumbs, raisins and coconut, in milk chocolate.', ar: 'لبن وفتات رقائق وزبيب وجوز هند، في شوكولاتة باللبن.' } },
    { key: 'guava', price: 70, weight: 80, inner: '#FF8E8E', coat: null, top: 'chili', topCol: '#D7262E', tag: 'new',
      name: { en: 'Guava Chili', ar: 'جوافة بالشطة' },
      desc: { en: 'Pink guava sorbet with a pinch of chili. Sweet, then a kick.', ar: 'سوربيه جوافة بمبي بقرصة شطة. حلوة وبعدين بتلسع.' } },
    { key: 'dates', price: 80, weight: 85, inner: '#9C6A43', coat: '#3B2219', top: 'sesame', topCol: '#F2E3C2', tag: 'new',
      name: { en: 'Dates & Coffee', ar: 'بلح وقهوة' },
      desc: { en: 'Siwa dates and Turkish coffee, sesame on top.', ar: 'بلح سيوي وقهوة تركي، وسمسم على الوش.' } },
    { key: 'lemon', price: 65, weight: 80, inner: '#EAF27A', coat: null, top: 'mint', topCol: '#3E9E5A',
      name: { en: 'Lemon Mint', ar: 'ليمون نعناع' },
      desc: { en: 'Baladi lemon and fresh mint sorbet. Very cold, very loud.', ar: 'سوربيه ليمون بلدي ونعناع فريش. ساقع جدًا.' } },
    { key: 'sobia', price: 75, weight: 85, inner: '#FFF8EE', coat: '#FF9FB3', top: 'flakes', topCol: '#FFFFFF',
      name: { en: 'Sobia', ar: 'سوبيا' },
      desc: { en: 'Coconut and rice milk, like the Ramadan drink, in a pink shell.', ar: 'جوز هند ولبن بالرز زي مشروب رمضان، في قشرة بمبي.' } },
    { key: 'caramel', price: 80, weight: 85, inner: '#E2A15A', coat: '#7A4A2E', top: 'salt', topCol: '#FFFFFF', tag: 'best',
      name: { en: 'Salted Caramel', ar: 'كراميل بالملح' },
      desc: { en: 'Burnt caramel, milk chocolate, sea salt flakes.', ar: 'كراميل محروق، شوكولاتة باللبن، ورقائق ملح بحري.' } },
  ];

  const SPOTS = {
    cairo: [
      { name: { en: 'Zamalek kiosk', ar: 'كشك الزمالك' }, note: { en: 'Next to the river walk · 12pm – 2am', ar: 'جنب ممشى النيل · 12 الضهر – 2 بالليل' }, xy: [300, 150] },
      { name: { en: 'Maadi corner', ar: 'ناصية المعادي' }, note: { en: 'Road 9 area · 1pm – 1am', ar: 'منطقة شارع 9 · 1 الضهر – 1 بالليل' }, xy: [340, 290] },
      { name: { en: 'New Cairo freezer', ar: 'فريزر التجمع' }, note: { en: 'Inside partner cafés · 10am – 12am', ar: 'جوّه الكافيهات الشريكة · 10 الصبح – 12 بالليل' }, xy: [470, 210] },
    ],
    giza: [
      { name: { en: 'Sheikh Zayed cart', ar: 'عربية الشيخ زايد' }, note: { en: 'Weekends · 4pm – 1am', ar: 'الويك إند · 4 العصر – 1 بالليل' }, xy: [130, 200] },
      { name: { en: 'Dokki freezer', ar: 'فريزر الدقي' }, note: { en: 'Inside partner shops · 9am – 11pm', ar: 'جوّه المحلات الشريكة · 9 الصبح – 11 بالليل' }, xy: [250, 200] },
    ],
    alex: [
      { name: { en: 'Corniche cart', ar: 'عربية الكورنيش' }, note: { en: 'Summer only · 5pm – 2am', ar: 'الصيف بس · 5 العصر – 2 بالليل' }, xy: [260, 130] },
      { name: { en: 'Smouha freezer', ar: 'فريزر سموحة' }, note: { en: 'Inside partner cafés · 11am – 12am', ar: 'جوّه الكافيهات الشريكة · 11 الصبح – 12 بالليل' }, xy: [360, 220] },
    ],
  };

  const UI = {
    en: {
      menu: 'Menu', close: 'Close', cur: 'EGP', g: 'g', add: 'Add to bag', added: 'Added!', new: 'New', best: 'Bestseller',
      soldOut: { alex: 'Out of stock in Alexandria' },
      cart: 'Your bag', empty: 'Your bag is empty. The freezer is not.', total: 'Total', checkout: 'Order now', demo: 'This showcase copy of the store does not place real orders.',
      box: 'Box of 6', boxFull: 'Your box is full', boxHint: (n) => `${6 - n} more to go`, boxAdd: 'Add the box to bag', boxDone: 'Box added to bag!', boxSave: 'save 10%',
      sent: 'Thanks! This showcase copy of the site does not send messages.', bad: 'Please fill in your name and phone.',
      cities: { cairo: 'Cairo', giza: 'Giza', alex: 'Alexandria' },
    },
    ar: {
      menu: 'المنيو', close: 'اقفل', cur: 'جنيه', g: 'جم', add: 'ضيف للشنطة', added: 'اتضافت!', new: 'جديد', best: 'الأكثر طلبًا',
      soldOut: { alex: 'خلصانة في إسكندرية' },
      cart: 'شنطتك', empty: 'شنطتك فاضية… بس الفريزر مليان.', total: 'الإجمالي', checkout: 'اطلب دلوقتي', demo: 'النسخة دي من المتجر للعرض ومبتبعتش طلبات حقيقية.',
      box: 'بوكس 6 قطع', boxFull: 'البوكس اتملى', boxHint: (n) => `فاضل ${6 - n}`, boxAdd: 'ضيف البوكس للشنطة', boxDone: 'البوكس اتضاف للشنطة!', boxSave: 'وفّر 10%',
      sent: 'شكرًا! النسخة دي من الموقع للعرض ومبتبعتش رسايل.', bad: 'اكتب اسمك ورقم تليفونك.',
      cities: { cairo: 'القاهرة', giza: 'الجيزة', alex: 'إسكندرية' },
    },
  }[L];

  return { L, AR: L === 'ar', t, BARS, SPOTS, UI };
})();
