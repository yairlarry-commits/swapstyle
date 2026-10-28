// Languages: Hebrew (default, right-to-left) and English.
//
// The app is written in English. Every piece of text that reaches the screen passes through tr()
// (see src/i18n/jsx-runtime.js), which swaps in the Hebrew when Hebrew is on. So adding a new
// string to a screen only needs a Hebrew line here: exact sentences in HE, patterns in HE_PATTERNS.

const KEY = 'swapstyle-lang';
const listeners = new Set();

function initialLang() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'he' || saved === 'en') return saved;
  } catch {}
  return 'he';
}

let current = initialLang();
applyDirection(current);

export function getLang() {
  return current;
}

export function setLang(lang) {
  current = lang;
  try {
    localStorage.setItem(KEY, lang);
  } catch {}
  applyDirection(lang);
  listeners.forEach((fn) => fn(lang));
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function applyDirection(lang) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
}

// Translate one piece of text, keeping the spaces around it
export function tr(text) {
  if (current !== 'he' || typeof text !== 'string') return text;
  const core = text.trim();
  if (!core) return text;
  const lead = text.slice(0, text.indexOf(core));
  const trail = text.slice(text.indexOf(core) + core.length);
  let out = HE[core];
  if (out === undefined) {
    for (const [re, rep] of HE_PATTERNS) {
      if (re.test(core)) {
        out = core.replace(re, rep);
        break;
      }
    }
  }
  return out === undefined ? text : lead + out + trail;
}

const HE_PATTERNS = [
  [/^(\d+)m ago$/, 'לפני $1 דק׳'],
  [/^(\d+)h ago$/, 'לפני $1 שע׳'],
  [/^(\d+)d ago$/, 'לפני $1 ימים'],
  [/^Report @(.+)$/, 'דיווח על @$1'],
  [/^Suspend @(.+)$/, 'השעיית @$1'],
  [/^Open · (\d+)$/, 'פתוחים · $1'],
  [/^Handled · (\d+)$/, 'טופלו · $1'],
  [/^Each side pays ₪(\d+) shipping$/, 'כל צד משלם ₪$1 משלוח'],
  [/^Each side pays ₪(\d+)$/, 'כל צד משלם ₪$1'],
  [/^Pay your shipping · ₪(\d+)$/, 'תשלום על המשלוח שלכם · ₪$1'],
  [/^sent · tracking (.+)$/, 'נשלח · מספר מעקב $1'],
  [/^Crop corner (.+)$/, 'פינת חיתוך $1'],
];

const HE = {
  // ---- general / navigation
  Feed: 'פיד',
  Offers: 'הצעות',
  Add: 'הוספה',
  Closet: 'ארון',
  Back: 'חזרה',
  Close: 'סגירה',
  Done: 'סיום',
  Cancel: 'ביטול',
  Edit: 'עריכה',
  Send: 'שליחה',
  Reset: 'איפוס',
  All: 'הכל',
  Any: 'הכל',
  'just now': 'עכשיו',
  'Loading SwapStyle…': 'SwapStyle נטען…',
  'Something went wrong.': 'משהו השתבש.',
  'SwapStyle hit a snag': 'משהו השתבש ב־SwapStyle',
  'The app ran into a problem while loading. This is usually fixed by reloading.': 'הייתה בעיה בטעינת האפליקציה. בדרך כלל טעינה מחדש פותרת את זה.',
  'Reload app': 'טעינה מחדש',
  English: 'English',
  עברית: 'עברית',

  // ---- sign in
  'Swap clothes you no longer wear for something new. Zero cost, zero waste.': 'מחליפים בגדים שכבר לא לובשים בחדשים. בלי עלות, בלי בזבוז.',
  'Create account': 'הרשמה',
  'Sign in': 'כניסה',
  'Sign out': 'יציאה',
  Email: 'אימייל',
  Username: 'שם משתמש',
  'City (optional)': 'עיר (לא חובה)',
  Password: 'סיסמה',
  'Start swapping': 'מתחילים להחליף',
  'Try the demo – no sign-up': 'נסו את ההדגמה – בלי הרשמה',
  'By continuing you agree to swap responsibly and kindly.': 'בהמשך אתם מסכימים להחליף באחריות ובנעימות.',
  'Demo mode: your account and items are saved only on this device and browser.': 'מצב הדגמה: החשבון והפריטים נשמרים רק במכשיר ובדפדפן הזה.',
  "Demo mode: this browser doesn't let the page save anything, so you'll start fresh each time you open it.": 'מצב הדגמה: הדפדפן הזה לא מאפשר לשמור, אז בכל פתיחה מתחילים מחדש.',
  'Choose a username with at least 2 characters.': 'בחרו שם משתמש עם 2 תווים לפחות.',
  'Password must be at least 6 characters.': 'הסיסמה צריכה להיות באורך 6 תווים לפחות.',
  'An account with this email already exists. Try signing in.': 'כבר יש חשבון עם האימייל הזה. נסו להיכנס.',
  'Incorrect email or password.': 'אימייל או סיסמה שגויים.',
  'Almost there! Check your email and tap the confirmation link, then sign in.': 'כמעט סיימנו! פתחו את האימייל, לחצו על קישור האישור ואז היכנסו.',

  // ---- feed
  'Fresh drops to swap into': 'פריטים חדשים להחלפה',
  Women: 'נשים',
  Men: 'גברים',
  Kids: 'ילדים',
  Accessories: 'אקססוריז',
  women: 'נשים',
  men: 'גברים',
  kids: 'ילדים',
  accessories: 'אקססוריז',
  'More filters': 'עוד סינונים',
  Type: 'סוג',
  Size: 'מידה',
  Single: 'פריט בודד',
  Bundle: 'חבילה',
  'Bundle ·': 'חבילה ·',
  'Clear filters': 'ניקוי סינונים',
  "Couldn't load feed.": 'לא הצלחנו לטעון את הפיד.',
  'Request Swap': 'בקשת החלפה',
  'No items yet': 'אין עדיין פריטים',
  'Try a different filter, or be the first to upload a piece to the swap.': 'נסו סינון אחר, או היו הראשונים להעלות פריט להחלפה.',
  'No location': 'בלי מיקום',
  'Your account is suspended. You can browse, but not post or swap.': 'החשבון שלכם מושעה. אפשר לגלוש, אבל לא לפרסם או להחליף.',
  '0–12m': '0–12 ח׳',
  '1–2y': '1–2 שנים',
  '3–5y': '3–5 שנים',
  '6–8y': '6–8 שנים',
  '9–12y': '9–12 שנים',
  'One size': 'מידה אחת',

  // ---- conditions, garments, preferences
  'New with tags': 'חדש עם תווית',
  'Like new': 'כמו חדש',
  Good: 'מצב טוב',
  Fair: 'סביר',
  'T-shirt': 'טי־שירט',
  Shirt: 'חולצה מכופתרת',
  Sweater: 'סוודר',
  Jacket: "ג'קט",
  Coat: 'מעיל',
  Dress: 'שמלה',
  Skirt: 'חצאית',
  Pants: 'מכנסיים',
  Jeans: "ג'ינס",
  Shorts: 'שורטס',
  'General / Square': 'כללי / ריבוע',
  General: 'כללי',
  Tee: 'טי',
  Knit: 'סריג',
  Top: 'חולצה',
  'Long sleeve': 'שרוול ארוך',
  'Bag / Acc.': 'תיק / אקס׳',
  Free: 'חופשי',
  'In-person or postal': 'פנים אל פנים או בדואר',
  'In-person only': 'רק פנים אל פנים',
  'Postal only': 'רק בדואר',

  // ---- item page + swap request
  'Back to feed': 'חזרה לפיד',
  'Item not found.': 'הפריט לא נמצא.',
  'Location not set': 'לא הוגדר מיקום',
  'This is your item. Waiting for swap requests.': 'זה הפריט שלכם. מחכים לבקשות החלפה.',
  'Already swapped — congrats!': 'כבר הוחלף, מזל טוב!',
  "This item was removed and isn't visible in the feed.": 'הפריט הוסר ולא מופיע בפיד.',
  'Report this item': 'דיווח על הפריט',
  'Offer a swap': 'הצעת החלפה',
  'Swap requested': 'הבקשה נשלחה',
  'Request sent to @': 'הבקשה נשלחה אל @',
  'You can chat with them now. Their answer shows up in your Offers tab.': 'אפשר כבר לדבר בצ׳אט. התשובה תופיע בלשונית ההצעות.',
  'Open chat': 'לצ׳אט',
  'You want': 'אתם רוצים',
  'Pick an item to offer': 'בחרו פריט להציע',
  'Your closet is empty. Upload something first to start swapping.': 'הארון שלכם ריק. העלו פריט כדי להתחיל להחליף.',
  'How to swap': 'איך מחליפים',
  'Message (optional)': 'הודעה (לא חובה)',
  "Say hi or suggest how you'd swap…": 'כתבו שלום או הציעו איך להחליף…',
  'Pick one of your items to offer.': 'בחרו אחד מהפריטים שלכם להציע.',
  'Offering your': 'מציעים את',
  'for their': 'שלכם תמורת',
  'Send swap request': 'שליחת בקשת החלפה',
  'Meet in person': 'פגישה פנים אל פנים',
  'Meet up and hand the items over': 'נפגשים ומחליפים',
  Shipping: 'משלוח',
  'Each side pays to ship their own item': 'כל צד משלם על המשלוח של הפריט שלו',

  // ---- upload + camera
  'Add an item': 'הוספת פריט',
  'Cleaned': 'מוכן',
  'Re-capture': 'צילום מחדש',
  'Open camera': 'פתיחת מצלמה',
  'Align · Position · Clean': 'יישור · מיקום · ניקוי',
  'What are you listing?': 'מה אתם מפרסמים?',
  'Number of items in bundle': 'מספר פריטים בחבילה',
  Category: 'קטגוריה',
  'Age group': 'גיל',
  'Garment type': 'סוג בגד',
  Condition: 'מצב',
  Title: 'כותרת',
  'e.g. Linen shirt, barely worn': 'למשל: חולצת פשתן, כמעט לא נלבשה',
  'Description (optional)': 'תיאור (לא חובה)',
  'Brand, fit, any notes…': 'מותג, גזרה, הערות…',
  'Dominant color (optional)': 'צבע עיקרי (לא חובה)',
  'e.g. cream, navy': 'למשל: שמנת, כחול כהה',
  'Add a photo of your item first.': 'קודם הוסיפו תמונה של הפריט.',
  'Give your item a title.': 'תנו לפריט כותרת.',
  'Publish to swap feed': 'פרסום בפיד ההחלפות',
  'Items are visible to everyone on SwapStyle.': 'הפריטים גלויים לכל משתמשי SwapStyle.',
  Capture: 'צילום',
  Crop: 'חיתוך',
  Position: 'מיקום',
  Gallery: 'גלריה',
  'Take photo': 'צלמו',
  'Live camera': 'מצלמה חיה',
  'Phone camera': 'מצלמת הטלפון',
  'The camera did not open. Tap Open camera and allow access.': 'המצלמה לא נפתחה. לחצו "פתחו מצלמה" ואשרו גישה.',
  'Starting camera…': 'המצלמה נפתחת…',
  'Lay it flat and line it up with the outline.': 'הניחו את הבגד שטוח ויישרו אותו לשרטוט.',
  'Drag the corners to cut away the surroundings': 'גררו את הפינות כדי לחתוך את מה שמסביב',
  'Drag to position · pinch to zoom & rotate': 'גררו למיקום · צבטו להגדלה ולסיבוב',
  'Frame 4:5': 'מסגרת 4:5',
  'Apply crop': 'החלת חיתוך',
  'White outside outline': 'לבן מחוץ לשרטוט',
  Retake: 'מחדש',
  'Also remove the background inside the outline': 'להסיר גם את הרקע בתוך השרטוט',
  'Preparing your photo…': 'מכינים את התמונה…',
  'Background removed': 'הרקע הוסר',
  'Photo ready': 'התמונה מוכנה',
  'Your item sits on a clean studio card, so it looks consistent across the swap feed.': 'הפריט מוצג על רקע נקי, כך שהוא נראה אחיד בפיד.',
  'Use this photo': 'שימוש בתמונה',
  'Zoom out': 'הקטנה',
  'Zoom in': 'הגדלה',
  Rotate: 'סיבוב',
  'Please choose an image file.': 'בחרו קובץ תמונה.',
  'Image is too large (max 15MB).': 'התמונה גדולה מדי (עד 15MB).',
  'Could not crop this photo.': 'לא הצלחנו לחתוך את התמונה.',
  'Background removal failed. Try another photo.': 'הסרת הרקע נכשלה. נסו תמונה אחרת.',

  // ---- offers
  'Your swap requests & incoming offers': 'הבקשות שלכם וההצעות שקיבלתם',
  'Mute notifications': 'השתקת התראות',
  'Unmute notifications': 'הפעלת התראות',
  Incoming: 'נכנסות',
  Sent: 'נשלחו',
  'No offers yet': 'אין עדיין הצעות',
  "When someone requests one of your items, or you request theirs, it'll show up here.": 'כשמישהו יבקש פריט שלכם, או אתם פריט של מישהו, זה יופיע כאן.',
  'Browse the feed': 'לגלישה בפיד',
  Offered: 'מוצע',
  For: 'תמורת',
  Accept: 'אישור',
  Decline: 'דחייה',
  Accepted: 'אושרה',
  Declined: 'נדחתה',
  Pending: 'ממתינה',
  Countered: 'הצעה נגדית',
  Completed: 'הושלמה',
  'Awaiting reply': 'מחכים לתשובה',
  'Chat & swap details': 'צ׳אט ופרטי ההחלפה',

  // ---- swap screen
  'In progress': 'בתהליך',
  'This swap could not be found.': 'ההחלפה לא נמצאה.',
  'Back to offers': 'חזרה להצעות',
  'You give': 'אתם נותנים',
  'You get': 'אתם מקבלים',
  'How the swap happens': 'איך מתבצעת ההחלפה',
  'The owner only swaps': 'בעל הפריט מחליף רק',
  'by post': 'בדואר',
  'in person': 'פנים אל פנים',
  'wants to swap with you': 'רוצה להחליף איתכם',
  'Chat below if you have questions, then decide.': 'יש שאלות? דברו בצ׳אט ואז החליטו.',
  'Waiting for @': 'מחכים לאישור של @',
  'to accept.': '.',
  'Meet-up steps': 'שלבי המפגש',
  'Agree on a time and place': 'קובעים זמן ומקום',
  'Use the chat below. Pick a public place you both know.': 'השתמשו בצ׳אט. בחרו מקום ציבורי ששניכם מכירים.',
  'Swap the items': 'מחליפים את הפריטים',
  'You confirmed the swap': 'אישרתם את ההחלפה',
  'We swapped – I got my item': 'החלפנו – קיבלתי את הפריט',
  confirmed: 'אישר/ה',
  'not confirmed yet': 'עוד לא אישר/ה',
  'Shipping steps': 'שלבי המשלוח',
  'Your delivery address': 'כתובת למשלוח',
  'address added': 'הוסיף/ה כתובת',
  'no address yet': 'עוד אין כתובת',
  'Full name': 'שם מלא',
  'Street and number': 'רחוב ומספר',
  City: 'עיר',
  Phone: 'טלפון',
  'Save address': 'שמירת כתובת',
  'Only your swap partner sees it, and only after you both paid.': 'רק השותף להחלפה רואה אותה, ורק אחרי ששניכם שילמתם.',
  'You paid ₪': 'שילמתם ₪',
  'Each side pays to send their own item.': 'כל צד משלם על שליחת הפריט שלו.',
  'Pay ₪': 'תשלום ₪',
  'Test mode: no money is charged yet. A payment service still needs to be connected.': 'מצב ניסיון: לא נגבה כסף. עדיין צריך לחבר שירות סליקה.',
  paid: 'שילם/ה',
  "hasn't paid yet": 'עוד לא שילם/ה',
  'Send your item': 'שליחת הפריט שלכם',
  Ship: 'שלחו את',
  your: 'הפריט שלכם',
  'item to @': 'אל @',
  'Sent · tracking': 'נשלח · מספר מעקב',
  'Tracking number': 'מספר מעקב',
  'The address to send to appears once you both paid.': 'הכתובת למשלוח תופיע אחרי ששניכם תשלמו.',
  "hasn't sent yet": 'עוד לא שלח/ה',
  'Got your new item?': 'הפריט החדש הגיע?',
  'You confirmed you received it': 'אישרתם שקיבלתם',
  'I received my item': 'קיבלתי את הפריט',
  received: 'קיבל/ה',
  "hasn't confirmed yet": 'עוד לא אישר/ה',
  'Swap complete!': 'ההחלפה הושלמה!',
  'Enjoy your new piece. Thanks for swapping instead of buying.': 'תהנו מהפריט החדש. תודה שהחלפתם במקום לקנות.',
  'Chat with @': 'צ׳אט עם @',
  'Chat with': 'צ׳אט עם',
  'Request sent to': 'הבקשה נשלחה אל',
  'Waiting for': 'מחכים לאישור של',
  'item to': 'אל',
  '· by': '· דווח ע״י',
  someone: 'מישהו',
  'No messages yet. Say hi and agree on the details.': 'אין עדיין הודעות. כתבו שלום וסגרו את הפרטים.',
  'Write a message…': 'כתבו הודעה…',
  'Copy address': 'העתקת כתובת',
  'Report this conversation': 'דיווח על השיחה',
  // demo partner replies
  'Hi! Happy to swap. Does that work for you?': 'היי! אשמח להחליף. מתאים לך?',
  'Sounds good to me.': 'נשמע לי טוב.',
  'Great, talk soon!': 'מעולה, נדבר!',
  'Perfect, thanks!': 'מושלם, תודה!',
  'Hi! Accepted. When is good for you to meet?': 'היי! אישרתי. מתי נוח לך להיפגש?',
  "Hi! Accepted. Let's do it by post - add your address and pay the shipping, I'll do the same.": 'היי! אישרתי. בואו נעשה את זה בדואר: הוסיפו כתובת ושלמו על המשלוח, ואני אעשה אותו דבר.',
  'Sent! Tracking number is in the app.': 'שלחתי! מספר המעקב באפליקציה.',
  'Got it, thanks! Enjoy :)': 'הגיע, תודה! תהנו :)',

  // ---- profile
  Available: 'זמינים',
  Swapped: 'הוחלפו',
  Total: 'סה״כ',
  'Edit profile': 'עריכת פרופיל',
  items: 'פריטים',
  'Your closet is empty': 'הארון שלכם ריק',
  'Upload your first piece to start swapping.': 'העלו את הפריט הראשון כדי להתחיל להחליף.',
  'Check back soon for new drops.': 'בקרו שוב בקרוב.',
  'Upload an item': 'העלאת פריט',
  'Swap preference': 'העדפת החלפה',
  'e.g. Tel Aviv': 'למשל: תל אביב',
  'Save changes': 'שמירה',
  'Admin · reports': 'ניהול · דיווחים',
  Admin: 'מנהל',
  Suspended: 'מושעה',
  "Your account is suspended, so you can't post items, request swaps or send messages.": 'החשבון שלכם מושעה, ולכן אי אפשר לפרסם, לבקש החלפות או לשלוח הודעות.',
  Language: 'שפה',

  // ---- reports + admin
  Report: 'דיווח',
  'Report sent': 'הדיווח נשלח',
  'Thanks. The SwapStyle team will take a look.': 'תודה. צוות SwapStyle יבדוק.',
  "What's wrong? Reports are private: the other person won't see who sent them.": 'מה הבעיה? הדיווח פרטי: הצד השני לא יראה מי דיווח.',
  'Inappropriate or offensive': 'לא הולם או פוגעני',
  'Misleading photo or description': 'תמונה או תיאור מטעים',
  'Harassment or abuse': 'הטרדה או התעללות',
  'Spam or scam': 'ספאם או הונאה',
  'Something else': 'משהו אחר',
  'Anything else we should know? (optional)': 'עוד משהו שכדאי לדעת? (לא חובה)',
  'Send report': 'שליחת דיווח',
  'Tap again to confirm': 'לחצו שוב לאישור',
  'Reports from the community': 'דיווחים מהקהילה',
  'This page is for SwapStyle admins.': 'הדף הזה מיועד למנהלי SwapStyle.',
  'All clear': 'הכל נקי',
  'Nothing handled yet': 'עוד לא טופל כלום',
  'No open reports right now.': 'אין כרגע דיווחים פתוחים.',
  'Reports you resolve or dismiss show up here.': 'דיווחים שטיפלתם בהם או ביטלתם יופיעו כאן.',
  Resolved: 'טופל',
  Dismissed: 'בוטל',
  item: 'פריט',
  profile: 'פרופיל',
  swap: 'שיחה',
  '· by @': '· דווח ע״י @',
  'This item no longer exists.': 'הפריט כבר לא קיים.',
  'This profile no longer exists.': 'הפרופיל כבר לא קיים.',
  'This conversation no longer exists.': 'השיחה כבר לא קיימת.',
  Removed: 'הוסר',
  available: 'זמין',
  swapped: 'הוחלף',
  'Restore item': 'שחזור הפריט',
  'Remove item': 'הסרת הפריט',
  'Lift suspension': 'ביטול השעיה',
  Suspend: 'השעיה',
  'Suspend @': 'השעיית @',
  messages: 'הודעות',
  'No messages.': 'אין הודעות.',
  'Delete message': 'מחיקת הודעה',
  Dismiss: 'ביטול',
  'Mark resolved': 'סימון כטופל',
  Reopen: 'פתיחה מחדש',

  // ---- errors from the app
  'Your account is suspended.': 'החשבון שלכם מושעה.',
  'Only admins can do that.': 'רק מנהלים יכולים לעשות את זה.',
  'Chat is not set up yet: run supabase/migration_002_chat_and_shipping.sql in Supabase.': 'הצ׳אט עדיין לא מוגדר: צריך להריץ את migration_002 ב־Supabase.',
  'Reporting is not set up yet: run supabase/migration_003_admin_and_reports.sql in Supabase.': 'הדיווחים עדיין לא מוגדרים: צריך להריץ את migration_003 ב־Supabase.',
  'Admin tools are not set up yet: run supabase/migration_003_admin_and_reports.sql in Supabase.': 'כלי הניהול עדיין לא מוגדרים: צריך להריץ את migration_003 ב־Supabase.',
};
