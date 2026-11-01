/* OVERFLOW Burgers & Fries — catalogue shared by the site and the dashboard. A website by Foodidu Business. Prices in EGP. */
window.OF_DATA = (() => {
  const CATS = [
    { id: 'burgers', name: 'Burgers', blurb: 'Two hand-pressed patties, griddled to order. Little = one.' },
    { id: 'dogs', name: 'Hot Dogs', blurb: 'All-beef dogs, split and grilled till the edges crack.' },
    { id: 'sandwiches', name: 'Sandwiches', blurb: 'For the days you want something between the bread that isn’t a patty.' },
    { id: 'fries', name: 'Fries', blurb: 'Fresh-cut potatoes, cooked twice. Every cup gets an extra scoop in the bag.' },
    { id: 'shakes', name: 'Shakes', blurb: 'Hand-spun vanilla base. Mix-ins are free. All of them, if you want.' },
    { id: 'drinks', name: 'Drinks', blurb: 'Cold, fizzy, or freshly squeezed.' },
  ];

  // art: which illustration to draw. layers: base burger stack (toppings are added on top of it by the builder)
  const ITEMS = [
    { id: 'overflow', cat: 'burgers', name: 'Overflow Burger', price: 245, kcal: 840, tag: 'Signature', art: 'burger', layers: ['patty', 'patty'], desc: 'Two patties, toasted sesame bun, toppings your way.', builder: 'burger' },
    { id: 'cheese', cat: 'burgers', name: 'Cheeseburger', price: 270, kcal: 980, tag: 'Best seller', art: 'burger', layers: ['patty', 'cheese', 'patty', 'cheese'], desc: 'Two patties, two slices of melted American cheese.', builder: 'burger' },
    { id: 'bacon-cheese', cat: 'burgers', name: 'Bacon Cheeseburger', price: 310, kcal: 1080, art: 'burger', layers: ['patty', 'cheese', 'bacon', 'patty', 'cheese'], desc: 'The cheeseburger plus crisp beef bacon. A lot of burger.', builder: 'burger' },
    { id: 'little', cat: 'burgers', name: 'Little Burger', price: 175, kcal: 540, art: 'burger', layers: ['patty'], desc: 'One patty. Same bun, same toppings, smaller appetite.', builder: 'burger' },
    { id: 'little-cheese', cat: 'burgers', name: 'Little Cheeseburger', price: 195, kcal: 610, art: 'burger', layers: ['patty', 'cheese'], desc: 'One patty, one slice of cheese.', builder: 'burger' },
    { id: 'little-bacon', cat: 'burgers', name: 'Little Bacon Burger', price: 225, kcal: 660, tag: 'New', art: 'burger', layers: ['patty', 'bacon'], desc: 'One patty with crisp beef bacon.', builder: 'burger' },
    { id: 'hotdog', cat: 'dogs', name: 'Hot Dog', price: 150, kcal: 520, art: 'dog', desc: 'All-beef dog, split and grilled, toasted bun.', builder: 'burger' },
    { id: 'cheese-dog', cat: 'dogs', name: 'Cheese Dog', price: 170, kcal: 590, art: 'dog', cheese: true, desc: 'The dog with a melted slice on top.', builder: 'burger' },
    { id: 'bacon-dog', cat: 'dogs', name: 'Bacon Cheese Dog', price: 195, kcal: 660, art: 'dog', cheese: true, bacon: true, desc: 'Cheese, crisp beef bacon, and the dog underneath.', builder: 'burger' },
    { id: 'grilled-cheese', cat: 'sandwiches', name: 'Grilled Cheese', price: 140, kcal: 470, art: 'sandwich', desc: 'Two slices of melted cheese in a buttery, griddled bun.', builder: 'burger' },
    { id: 'veggie', cat: 'sandwiches', name: 'Veggie Sandwich', price: 130, kcal: 280, art: 'sandwich', veg: true, desc: 'Grilled onions, mushrooms, peppers and every fresh topping.', builder: 'burger' },
    { id: 'chicken', cat: 'sandwiches', name: 'Crispy Chicken', price: 210, kcal: 690, tag: 'New', art: 'sandwich', chicken: true, desc: 'Buttermilk chicken thigh, fried crisp, on a toasted bun.', builder: 'burger' },
    { id: 'fries', cat: 'fries', name: 'Overflow Fries', price: 120, kcal: 950, tag: 'Best seller', art: 'fries', desc: 'Fresh-cut, double-cooked. Little, regular or large.', builder: 'fries' },
    { id: 'cajun', cat: 'fries', name: 'Cajun Fries', price: 130, kcal: 950, art: 'fries', cajun: true, desc: 'Same fries, shaken with our smoky Cajun spice.', builder: 'fries' },
    { id: 'shake', cat: 'shakes', name: 'Milkshake', price: 140, kcal: 670, tag: 'Mix-ins free', art: 'shake', desc: 'Hand-spun vanilla. Pick as many mix-ins as you like.', builder: 'shake' },
    { id: 'soda', cat: 'drinks', name: 'Fountain Drink', price: 45, kcal: 200, art: 'cup', desc: 'Free refills when you dine in.', builder: 'drink' },
    { id: 'lemonade', cat: 'drinks', name: 'Fresh Lemonade', price: 60, kcal: 160, art: 'lemonade', desc: 'Squeezed every morning, with mint.', builder: null },
    { id: 'water', cat: 'drinks', name: 'Bottled Water', price: 25, kcal: 0, art: 'water', desc: 'Still, 600 ml.', builder: null },
  ];

  // 15 free toppings. allTheWay = the house default when you say "all the way"
  const TOPPINGS = [
    { id: 'mayo', name: 'Mayo', layer: 'mayo' }, { id: 'lettuce', name: 'Lettuce', layer: 'lettuce' }, { id: 'pickles', name: 'Pickles', layer: 'pickles' },
    { id: 'tomato', name: 'Tomatoes', layer: 'tomato' }, { id: 'grilled-onion', name: 'Grilled onions', layer: 'gonion' }, { id: 'mushroom', name: 'Grilled mushrooms', layer: 'mushroom' },
    { id: 'ketchup', name: 'Ketchup', layer: 'ketchup' }, { id: 'mustard', name: 'Mustard', layer: 'mustard' }, { id: 'relish', name: 'Relish', layer: 'relish' },
    { id: 'onion', name: 'Raw onions', layer: 'ronion' }, { id: 'jalapeno', name: 'Jalapeños', layer: 'jalapeno' }, { id: 'pepper', name: 'Green peppers', layer: 'pepper' },
    { id: 'steak', name: 'Steak sauce', layer: 'bbq' }, { id: 'bbq', name: 'BBQ sauce', layer: 'bbq' }, { id: 'hot', name: 'Hot sauce', layer: 'hot' },
  ];
  const ALL_THE_WAY = ['mayo', 'lettuce', 'pickles', 'tomato', 'grilled-onion', 'mushroom', 'ketchup', 'mustard'];
  const EXTRAS = [{ id: 'x-cheese', name: 'Add cheese', price: 25, layer: 'cheese' }, { id: 'x-bacon', name: 'Add bacon', price: 45, layer: 'bacon' }];
  const FRY_SIZES = [{ id: 'little', name: 'Little', add: -35 }, { id: 'regular', name: 'Regular', add: 0 }, { id: 'large', name: 'Large', add: 40 }];
  const MIXINS = ['Bacon', 'Banana', 'Cherries', 'Chocolate', 'Coffee', 'Cookie crumble', 'Peanut butter', 'Salted caramel', 'Strawberries', 'Malted milk', 'Lotus biscuit'];
  const DRINK_SIZES = [{ id: 'regular', name: 'Regular', add: 0 }, { id: 'large', name: 'Large', add: 15 }];

  // hours: [open, close] in 24h, close past midnight allowed (26 = 2am)
  const BRANCHES = [
    { id: 'zamalek', name: 'Zamalek', area: '26th of July St.', phone: '+20 100 000 0011', hours: [12, 26], seats: 48, x: 0.36, y: 0.44, delivery: true },
    { id: 'newcairo', name: 'New Cairo', area: '90th Street, Fifth Settlement', phone: '+20 100 000 0012', hours: [12, 27], seats: 90, x: 0.78, y: 0.56, delivery: true },
    { id: 'zayed', name: 'Sheikh Zayed', area: 'Arkan Plaza', phone: '+20 100 000 0013', hours: [12, 26], seats: 70, x: 0.12, y: 0.4, delivery: true },
    { id: 'maadi', name: 'Maadi', area: 'Road 9', phone: '+20 100 000 0014', hours: [11, 25], seats: 36, x: 0.46, y: 0.72, delivery: false },
  ];

  const ORDER = { deliveryFee: 35, serviceRate: 0.05, minDelivery: 150, promo: { code: 'OVERFLOW10', off: 0.1 } };
  // order lifecycle (both apps use these ids). pickup orders skip "out"
  const STATUS = [
    { id: 'new', name: 'Received', short: 'New' },
    { id: 'preparing', name: 'On the griddle', short: 'Preparing' },
    { id: 'ready', name: 'Ready', short: 'Ready' },
    { id: 'out', name: 'Out for delivery', short: 'Out' },
    { id: 'done', name: 'Completed', short: 'Done' },
  ];

  // photography: free Unsplash photos (Unsplash License), loaded from Unsplash's CDN
  const PH = {
    overflow: '1568901346375-23c9450c58cd', cheese: '1572802419224-296b0aeee0d9', 'bacon-cheese': '1553979459-d2229ba7433b', little: '1586190848861-99aa4a171e90',
    'little-cheese': '1607013251379-e6eecfffe234', 'little-bacon': '1546599115-c0c0815c391b', hotdog: '1776260486226-11dabfacf5f2', 'cheese-dog': '1638368593249-7cadb261e8b3',
    'bacon-dog': '1768250708131-23da8d1cb5ad', 'grilled-cheese': '1528736235302-52922df5c122', veggie: '1655279562015-047c3da9a271', chicken: '1703219342329-fce8488cf443',
    fries: '1687573974556-60ee7b27b2ee', cajun: '1585109649139-366815a0d713', shake: '1572490122747-3968b75cc699', soda: '1780443977499-4bd4b4993cc3',
    lemonade: '1575596510825-f748919a2bf7', water: '1523362628745-0c100150b504',
    hero: '1600688640154-9619e002df30', grill: '1522244451342-a41bf8a13d73', diner: '1555992336-fb0d29498b13', crew: '1651977560788-98792cd34da0',
    group: '1593759608142-e9b18c0dbe86', table: '1466978913421-dad2ebd01d17', shakePromo: '1553787499-6f9133860278', gift: '1568901839061-11e2837cd2b7',
    kitchen: '1761095596618-081ea3f043a5', friesCut: '1615485290836-4ebcebf44aaf', tomatoCut: '1587486938113-d6d38d424efa', tomatoes: '1587486938113-d6d38d424efa',
  };
  const img = (key, w = 800, h) => `https://images.unsplash.com/photo-${PH[key] || key}?w=${w}${h ? `&h=${h}&fit=crop` : ''}&q=72&auto=format`;
  // Arabic pages (html lang="ar") get Arabic names; stored ids stay English so the dashboard reads every order
  const AR = document.documentElement.lang === 'ar';
  const LABEL = AR ? {
    Bacon: 'بيكون', Banana: 'موز', Cherries: 'كريز', Chocolate: 'شوكولاتة', Coffee: 'قهوة', 'Cookie crumble': 'كوكيز', 'Peanut butter': 'زبدة فول سوداني',
    'Salted caramel': 'كراميل مملّح', Strawberries: 'فراولة', 'Malted milk': 'ميلت', 'Lotus biscuit': 'لوتس', Classic: 'كلاسيك', Cajun: 'كاجن',
    Cash: 'كاش', 'Card at the counter': 'كارت', 'Wallet (InstaPay)': 'محفظة (إنستاباي)',
  } : {};
  const label = (x) => LABEL[x] || x;
  const UI = AR ? { atw: 'بكل حاجة', plain: 'سادة', sep: '، ' } : { atw: 'All the way', plain: 'Plain', sep: ', ' };
  if (AR) {
    const tr = (list, map) => list.forEach((x) => { const v = map[x.id]; if (v) Object.assign(x, typeof v === 'string' ? { name: v } : v); });
    tr(CATS, {
      burgers: { name: 'برجر', blurb: 'قطعتين لحمة بنشكّلهم بإيدينا وبيتشووا وقت طلبك. «ليتل» يعني قطعة واحدة.' },
      dogs: { name: 'هوت دوج', blurb: 'سجق لحمة بقري، بيتفتح ويتشوي لحد ما أطرافه تقرمش.' },
      sandwiches: { name: 'ساندويتشات', blurb: 'للأيام اللي عايز فيها حاجة بين العيش غير البرجر.' },
      fries: { name: 'بطاطس', blurb: 'بطاطس طازة بتتقطع كل يوم وبتتقلي مرتين. وكل كوباية معاها مغرفة زيادة في الشنطة.' },
      shakes: { name: 'ميلك شيك', blurb: 'فانيليا بتتخفق بالإيد. والإضافات ببلاش، كلها لو حابب.' },
      drinks: { name: 'مشروبات', blurb: 'ساقعة، فوّارة، أو معصورة طازة.' },
    });
    const TAG = { Signature: 'الأشهر', 'Best seller': 'الأكثر طلباً', New: 'جديد', 'Mix-ins free': 'الإضافات ببلاش' };
    ITEMS.forEach((i) => { if (i.tag) i.tag = TAG[i.tag] || i.tag; });
    tr(ITEMS, {
      overflow: { name: 'أوفرفلو برجر', desc: 'قطعتين لحمة، عيش بالسمسم متحمّص، والإضافات على مزاجك.' },
      cheese: { name: 'تشيز برجر', desc: 'قطعتين لحمة وشريحتين جبنة أمريكي سايحين.' },
      'bacon-cheese': { name: 'بيكون تشيز برجر', desc: 'التشيز برجر ومعاه بيكون بقري مقرمش. برجر تقيل.' },
      little: { name: 'ليتل برجر', desc: 'قطعة لحمة واحدة. نفس العيش ونفس الإضافات، لجوع أقل.' },
      'little-cheese': { name: 'ليتل تشيز برجر', desc: 'قطعة لحمة وشريحة جبنة.' },
      'little-bacon': { name: 'ليتل بيكون برجر', desc: 'قطعة لحمة مع بيكون بقري مقرمش.' },
      hotdog: { name: 'هوت دوج', desc: 'سجق لحمة بقري مشوي في عيش متحمّص.' },
      'cheese-dog': { name: 'تشيز دوج', desc: 'الهوت دوج وفوقه شريحة جبنة سايحة.' },
      'bacon-dog': { name: 'بيكون تشيز دوج', desc: 'جبنة وبيكون بقري مقرمش، والسجق تحتهم.' },
      'grilled-cheese': { name: 'جريلد تشيز', desc: 'شريحتين جبنة سايحين في عيش متحمّص بالزبدة.' },
      veggie: { name: 'ساندويتش خضار', desc: 'بصل ومشروم وفلفل مشويين، ومعاهم كل الإضافات الطازة.' },
      chicken: { name: 'كرسبي تشيكن', desc: 'فراخ متتبلة باللبن ومقلية مقرمشة في عيش متحمّص.' },
      fries: { name: 'أوفرفلو فرايز', desc: 'بطاطس طازة بتتقلي مرتين. صغير، عادي أو كبير.' },
      cajun: { name: 'كاجن فرايز', desc: 'نفس البطاطس، متقلّبة في تتبيلة الكاجن المدخّنة.' },
      shake: { name: 'ميلك شيك', desc: 'فانيليا متخفوقة بالإيد. اختار إضافات قد ما تحب.' },
      soda: { name: 'مشروب غازي', desc: 'إعادة ملء ببلاش لو بتاكل عندنا.' },
      lemonade: { name: 'ليمون فريش', desc: 'بيتعصر كل يوم الصبح، بالنعناع.' },
      water: { name: 'مياه معدنية', desc: 'سادة، 600 مل.' },
    });
    tr(TOPPINGS, { mayo: 'مايونيز', lettuce: 'خس', pickles: 'مخلل', tomato: 'طماطم', 'grilled-onion': 'بصل مشوي', mushroom: 'مشروم مشوي', ketchup: 'كاتشب', mustard: 'مسطردة',
      relish: 'ريليش', onion: 'بصل نيء', jalapeno: 'هالبينو', pepper: 'فلفل أخضر', steak: 'صوص ستيك', bbq: 'صوص باربكيو', hot: 'صوص حار' });
    tr(EXTRAS, { 'x-cheese': 'زوّد جبنة', 'x-bacon': 'زوّد بيكون' });
    tr(FRY_SIZES, { little: 'صغير', regular: 'عادي', large: 'كبير' });
    tr(DRINK_SIZES, { regular: 'عادي', large: 'كبير' });
    tr(BRANCHES, { zamalek: { name: 'الزمالك', area: 'شارع 26 يوليو' }, newcairo: { name: 'القاهرة الجديدة', area: 'شارع التسعين، التجمع الخامس' }, zayed: { name: 'الشيخ زايد', area: 'أركان بلازا' }, maadi: { name: 'المعادي', area: 'شارع 9' } });
    tr(STATUS, { new: 'الطلب وصل', preparing: 'على الشواية', ready: 'جاهز', out: 'في الطريق', done: 'تم' });
  }
  const byId = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
  const topById = Object.fromEntries(TOPPINGS.map((t) => [t.id, t]));
  const branchById = Object.fromEntries(BRANCHES.map((b) => [b.id, b]));
  return { AR, UI, label, PH, img, CATS, ITEMS, TOPPINGS, ALL_THE_WAY, EXTRAS, FRY_SIZES, MIXINS, DRINK_SIZES, BRANCHES, ORDER, STATUS, byId, topById, branchById };
})();
