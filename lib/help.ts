// Rule-based help: matches a question against topic keywords (English and Roman Urdu).
export type HelpTopic = {id: string; title: string; keys: string[]; answer: string};

export const helpTopics: HelpTopic[] = [
  {id:'book-ride', title:'How do I book a ride?', keys:['ride','book','booking','request','taxi','bike','rickshaw','car','safar','gari','gaari','kaise','kese','karun','karon','book karna'],
   answer:'Open Book a ride, choose your vehicle (Rickshaw, Bike, Economy, Comfort, Premium or Protocol car), search your pickup and destination anywhere in Pakistan (or pin them on the map), set the fare you want to pay and tap Find a driver. Registered drivers near you reply with offers and you choose one.'},
  {id:'fare', title:'How does the fare work?', keys:['fare','price','rate','kiraya','kiraye','kitna','kitne','paisa','paise','offer','negotiate','cost','charges'],
   answer:'You name your own fare. The app shows a suggested starting amount as an estimate only. Drivers can accept your fare or reply with their own price, and you pick the offer you like. Payment is cash to the driver at the end of the trip.'},
  {id:'track', title:'How do I track my driver?', keys:['track','my driver','driver kab','kab aayega','kab ayega','aayega','ayega','arrive','arriving','eta','live','map','kahan hai','kidhar','where is','how far'],
   answer:'After you accept an offer, the ride screen shows your driver live on the map with the estimated arrival time, vehicle and number plate. You can call the driver from the same screen.'},
  {id:'no-driver', title:'No driver is replying', keys:['no driver','nobody','koi driver','driver nahi','nahi mil','not found','waiting','searching','no offers','offers nahi','nobody replying','no one'],
   answer:'Offers only come from registered drivers who are online near your pickup. If none reply, try a slightly higher fare, another vehicle type, or a nearby pickup point, then post the request again. The ride screen tells you how many registered drivers are online near your pickup.'},
  {id:'become-driver', title:'How do I become a driver?', keys:['become a driver','become driver','driver banna','driver ban','apply as a driver','apply as driver','join as a driver','register as a driver','driver registration','driver application','partner','earn','kamana','kamai','job','banna','join','apply','application'],
   answer:'Open Earn with us, choose Driver, pick the vehicle types you drive, enter your vehicle model and number plate, and send the application. Only drivers approved by an admin can go online and accept rides. You can follow the review status in My account.'},
  {id:'go-online', title:'How does a driver go online?', keys:['go online','online','approval','approved','dashboard','offline','requests','ride requests'],
   answer:'Once your application is approved, open Driver dashboard from the account menu and tap the power button. Allow location access and keep the page open while you are online. Ride requests within about 15 km for your vehicle types appear there; you can accept the rider\'s fare or send your own price.'},
  {id:'payment', title:'How do I pay?', keys:['pay','payment','cash','card','easypaisa','jazzcash','bank','online payment','wallet','paisay','adaigi'],
   answer:'Payment is cash only for now: pay the driver at the end of a ride, or pay on delivery for marketplace orders. Online payments and wallets are not available yet.'},
  {id:'cancel', title:'How do I cancel?', keys:['cancel','cancle','khatam','band','stop','refund'],
   answer:'You can cancel a ride while it is searching, or after a driver is assigned but before the trip starts, using Cancel ride on the ride screen. Orders and cargo requests are cancelled through support; contact us with your reference number.'},
  {id:'cargo', title:'How do I book a parcel, loader, truck or bus?', keys:['parcel','loader','truck','bus','coach','hiace','coaster','daewoo','cargo','freight','shifting','saman','samaan','mazda','shehzore','suzuki','pickup'],
   answer:'Open Cargo & buses, choose the category and vehicle, enter your route, and send the request. An operator reviews it and confirms availability and price. Bus and coach requests are enquiries only, not tickets, and Raftaar One is not affiliated with any coach operator.'},
  {id:'orders', title:'How do I order food or groceries?', keys:['order','food','grocery','groceries','cart','checkout','marketplace','shop','delivery fee','khana','products','accessories'],
   answer:'Browse the Marketplace, add items to your cart and check out with your delivery address. The delivery fee is PKR 150 for now and payment is cash on delivery. Track your order status in My account.'},
  {id:'login', title:'I cannot sign in', keys:['login','log in','sign in','signin','password','forgot','email','confirm','verify','verification','account','nahi ho raha','login nahi'],
   answer:'Make sure you confirmed your email using the link we sent (check Spam too). Use Resend confirmation email on the sign-in screen if needed. If you forgot your password, use Reset password. Passwords need at least 12 characters when you create or change one.'},
  {id:'photo', title:'How do I add a profile photo?', keys:['photo','picture','image','avatar','profile','tasveer','pic','upload'],
   answer:'Open My account and tap Add photo or Change photo. Drivers can also add a vehicle photo to their application, and admins can add product images from the admin console.'},
  {id:'address', title:'How do I find my exact address?', keys:['address','pata','ghar','house','street','search','suggestion','pin','gps','my location','current location'],
   answer:'Start typing an area, street or landmark and pick a suggestion. Use My location for your current position, or tap Pin on map and touch the exact spot. You can add a house number or landmark in the extra field so the driver finds you easily.'},
  {id:'safety', title:'Is my information safe?', keys:['safe','safety','privacy','private','secure','security','data','phone number','number','mehfooz'],
   answer:'Only registered, admin-approved drivers can take rides. Riders see only approximate positions of nearby drivers, and phone numbers are shared only between the rider and the chosen driver once a ride is assigned. Never share passwords or OTPs with anyone.'},
  {id:'cities', title:'Which cities are covered?', keys:['city','cities','shehar','pakistan','karachi','lahore','islamabad','rawalpindi','faisalabad','multan','peshawar','quetta','available','coverage','area'],
   answer:'You can search and book anywhere in Pakistan. Whether a driver replies depends on registered drivers being online near your pickup, so busy cities usually respond faster.'},
  {id:'support', title:'How do I contact support?', keys:['contact','support','help','complaint','shikayat','problem','issue','call','email us','human','real person'],
   answer:'Email usaidahmeddon@gmail.com or call 0318 1014996. Include your ride, booking or order reference number, but never passwords or OTPs. This is not an emergency service.'}
];

const normalize = (text: string) => ' ' + text.toLowerCase().replace(/[^a-z0-9؀-ۿ\s]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';

export function answerQuestion(question: string) {
  const q = normalize(question);
  const scored = helpTopics.map(topic => ({
    topic,
    score: topic.keys.reduce((sum, key) => q.includes(' ' + key + ' ') || (key.length > 4 && q.includes(key)) ? sum + (key.includes(' ') ? 2 : 1) : sum, 0)
  })).filter(s => s.score > 0).sort((a, b) => b.score - a.score);
  if (!scored.length) {
    return {
      answer: 'I could not find an answer to that. Try one of the questions below, or contact support at usaidahmeddon@gmail.com or 0318 1014996.',
      related: helpTopics.slice(0, 5).map(t => ({id: t.id, title: t.title})),
      matched: false
    };
  }
  return {
    answer: scored[0].topic.answer,
    related: scored.slice(1, 4).map(s => ({id: s.topic.id, title: s.topic.title})),
    matched: true
  };
}
