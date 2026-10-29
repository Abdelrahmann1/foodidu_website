/* KHABTA — smash burgers from Cairo. A website by Foodidu Business. Content in English and Arabic. */
window.KH_DATA = (() => {
  const L = document.documentElement.lang === 'ar' ? 'ar' : 'en';
  const t = (v) => (v && typeof v === 'object' ? v[L] : v);

  // stack = layers from bottom to top (see art.js); price in EGP
  const MENU = [
    { key: 'asly', price: 185, tag: 'fav', stack: ['bunB', 'patty', 'cheese', 'patty', 'cheese', 'pickles', 'onion', 'sauce', 'bunT'], bg: '#FFC21A',
      name: { en: 'El Asly', ar: 'الأصلي' }, desc: { en: 'Double patty, cheddar, pickles, raw onion, Khabta sauce.', ar: 'قطعتين لحمة، شيدر، مخلل، بصل، وصوص خبطة.' } },
    { key: 'shatta', price: 195, tag: 'hot', stack: ['bunB', 'patty', 'jack', 'jalapeno', 'patty', 'jack', 'chili', 'bunT'], bg: '#FF8A5B',
      name: { en: 'Shatta Smash', ar: 'شطة سماش' }, desc: { en: 'Pepper jack, jalapeños and chili mayo. Bring water.', ar: 'جبنة بيبر جاك، هالبينو، ومايونيز بالشطة. هات ميّة.' } },
    { key: 'mushroom', price: 220, tag: null, stack: ['bunB', 'patty', 'swiss', 'mushroom', 'patty', 'swiss', 'garlic', 'bunT'], bg: '#E9D8B4',
      name: { en: 'Mushroom Melt', ar: 'مشروم ميلت' }, desc: { en: 'Swiss cheese, buttery mushrooms, roasted garlic mayo.', ar: 'جبنة سويسري، مشروم بالزبدة، ومايونيز ثوم مشوي.' } },
    { key: 'triple', price: 245, tag: 'big', stack: ['bunB', 'patty', 'cheese', 'patty', 'cheese', 'patty', 'cheese', 'pickles', 'sauce', 'bunT'], bg: '#9CCB6B',
      name: { en: 'Triple Khabta', ar: 'خبطة تريبل' }, desc: { en: 'Three smashed patties, three slices of cheddar. No regrets.', ar: 'تلات قطع لحمة متخبطين وتلات شرايح شيدر. ومفيش ندم.' } },
    { key: 'chicken', price: 175, tag: null, stack: ['bunB', 'lettuce', 'chicken', 'pickles', 'sauce', 'bunT'], bg: '#FFE3A1',
      name: { en: 'Chicken Crunch', ar: 'تشيكن كرانش' }, desc: { en: 'Crispy chicken thigh, lettuce, pickles, Khabta sauce.', ar: 'صدر فراخ كرسبي، خس، مخلل، وصوص خبطة.' } },
    { key: 'falafel', price: 150, tag: 'new', stack: ['bunB', 'lettuce', 'falafel', 'tomato', 'tahini', 'pickles', 'bunT'], bg: '#BFE3B4',
      name: { en: 'Falafel Smash', ar: 'برجر فلافل' }, desc: { en: 'A smashed falafel patty, tahini, tomato, pickles.', ar: 'قرص فلافل متخبط، طحينة، طماطم، ومخلل.' } },
  ];

  // build-your-burger options (prices are added to the base)
  const BUILD = {
    base: 95,
    bun: [{ key: 'potato', price: 0, name: { en: 'Potato bun', ar: 'عيش بطاطس' } }, { key: 'brioche', price: 15, name: { en: 'Brioche', ar: 'بريوش' } }],
    patties: [1, 2, 3], pattyPrice: 45,
    cheese: [{ key: 'none', price: 0, name: { en: 'No cheese', ar: 'من غير جبنة' } }, { key: 'cheese', price: 15, name: { en: 'Cheddar', ar: 'شيدر' } }, { key: 'jack', price: 20, name: { en: 'Pepper jack', ar: 'بيبر جاك' } }],
    extras: [
      { key: 'pickles', price: 0, name: { en: 'Pickles', ar: 'مخلل' } }, { key: 'onion', price: 0, name: { en: 'Onion', ar: 'بصل' } },
      { key: 'lettuce', price: 0, name: { en: 'Lettuce', ar: 'خس' } }, { key: 'tomato', price: 5, name: { en: 'Tomato', ar: 'طماطم' } },
      { key: 'jalapeno', price: 10, name: { en: 'Jalapeños', ar: 'هالبينو' } }, { key: 'mushroom', price: 20, name: { en: 'Mushrooms', ar: 'مشروم' } },
    ],
    sauce: [{ key: 'sauce', price: 0, name: { en: 'Khabta sauce', ar: 'صوص خبطة' } }, { key: 'chili', price: 0, name: { en: 'Chili mayo', ar: 'مايو شطة' } }, { key: 'garlic', price: 0, name: { en: 'Garlic mayo', ar: 'مايو ثوم' } }],
  };

  // branches along the delivery route (x, y in the route SVG, 0..2400 x 0..600)
  const BRANCHES = [
    { at: 0.08, name: { en: 'Zamalek', ar: 'الزمالك' }, note: { en: 'Next to the river · 1pm – 3am', ar: 'جنب النيل · 1 الضهر – 3 الفجر' } },
    { at: 0.27, name: { en: 'Heliopolis', ar: 'مصر الجديدة' }, note: { en: 'Korba area · 1pm – 2am', ar: 'منطقة الكوربة · 1 الضهر – 2 بالليل' } },
    { at: 0.45, name: { en: 'Nasr City', ar: 'مدينة نصر' }, note: { en: 'Abbas El Akkad · 12pm – 2am', ar: 'عباس العقاد · 12 الضهر – 2 بالليل' } },
    { at: 0.63, name: { en: 'New Cairo', ar: 'التجمع' }, note: { en: '90th Street · 12pm – 3am', ar: 'شارع التسعين · 12 الضهر – 3 الفجر' } },
    { at: 0.8, name: { en: 'Maadi', ar: 'المعادي' }, note: { en: 'Road 9 area · 1pm – 2am', ar: 'منطقة شارع 9 · 1 الضهر – 2 بالليل' } },
    { at: 0.95, name: { en: 'Sheikh Zayed', ar: 'الشيخ زايد' }, note: { en: 'Weekends till 4am', ar: 'الويك إند لحد 4 الفجر' } },
  ];

  const UI = {
    en: {
      menu: 'Menu', close: 'Close', cur: 'EGP', add: 'Add', added: 'Added to your order', fav: 'Fan fave', hot: 'Spicy', big: 'Big one', new: 'New',
      load: ['Heating the griddle…', 'Smashing the patties…', 'Melting the cheese…', 'Crowning the bun…', 'Ready. Khabta!'],
      bag: 'Your order', empty: 'Nothing here yet. The griddle is waiting.', total: 'Total', checkout: 'Place order', demo: 'This showcase copy of the site does not place real orders.',
      custom: 'Your burger', patties: (n) => `${n} patt${n > 1 ? 'ies' : 'y'}`, addBuild: 'Add my burger',
      steps: { bun: 'Bun', patties: 'Patties', cheese: 'Cheese', extras: 'Extras', sauce: 'Sauce' },
    },
    ar: {
      menu: 'المنيو', close: 'اقفل', cur: 'جنيه', add: 'ضيف', added: 'اتضاف لطلبك', fav: 'المفضّل', hot: 'حرّاق', big: 'الكبير', new: 'جديد',
      load: ['بنسخّن الصاج…', 'بنخبط اللحمة…', 'بنسيّح الجبنة…', 'بنقفل العيشة…', 'جاهز. خبطة!'],
      bag: 'طلبك', empty: 'لسه مفيش حاجة. الصاج مستنيك.', total: 'الإجمالي', checkout: 'اطلب', demo: 'النسخة دي من الموقع للعرض ومبتبعتش طلبات حقيقية.',
      custom: 'برجرك', patties: (n) => `${n} ${n > 1 ? 'قطع' : 'قطعة'}`, addBuild: 'ضيف برجري',
      steps: { bun: 'العيش', patties: 'اللحمة', cheese: 'الجبنة', extras: 'الإضافات', sauce: 'الصوص' },
    },
  }[L];

  return { L, AR: L === 'ar', t, MENU, BUILD, BRANCHES, UI };
})();
