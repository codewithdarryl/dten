import LegalPage, { type LegalSection } from "@/components/LegalPage";

const CONTACT = "daryltecheducationalnetwork@gmail.com";

const sections: LegalSection[] = [
  { heading: "Who we are", body: [
    "Daryl Tech & Educational Network (\"Daryl Tech\", \"we\", \"us\") is a technology studio and academy based in Accra, Ghana. We run this website, our online courses, internship programmes, and related services.",
    `For any privacy question, email ${CONTACT} or call +233 50 914 7164.`,
  ]},
  { heading: "Information we collect", body: [
    "We only collect what we need to run our services:",
    [
      "Account details: name, email address, password (stored encrypted), and profile photo if you upload one. If you sign in with Google or Apple, we receive your name and email from them.",
      "Enrollment details: course chosen, enrollment ID, phone number, and payment status.",
      "Learning activity: lesson progress, quiz answers, assignment and task submissions, grades, feedback and certificates.",
      "Internship applications: name, email, phone, chosen track, experience level, portfolio link, motivation, any CV you share, and the decision and reason we record.",
      "Contact, booking and newsletter forms: the details you type in, such as name, email, phone, company and message.",
      "Jael AI assistant: the messages, documents and screenshots you send to Jael, and any thumbs-up/down feedback.",
      "Technical data: basic device, browser and usage information needed to keep the site working and secure.",
    ],
  ]},
  { heading: "Payments", body: [
    "Course and programme payments are processed by Paystack in Ghana cedis (GHS). We never see or store your full card or mobile money details. We keep the payment reference, amount, and status so we can confirm your enrollment and send a receipt.",
  ]},
  { heading: "How we use your information", body: [[
    "To create and secure your account and verify your email.",
    "To enroll you in courses, track your progress and issue certificates you can verify online.",
    "To review internship applications and tell you the outcome.",
    "To reply to your messages and bookings.",
    "To send receipts, important account notices and, if you subscribe, our newsletter.",
    "To answer your questions through Jael, including reading text from documents you upload.",
    "To prevent fraud, abuse and unauthorised access.",
  ]]},
  { heading: "AI processing", body: [
    "Jael and assignment feedback are powered by third-party AI models. When you use them, the content you send is processed to generate a reply. Please don't share passwords, payment details or other sensitive personal information with Jael. AI feedback is guidance only — final grades are set by our staff.",
  ]},
  { heading: "Who we share information with", body: [
    "We do not sell your personal information. We share it only with:",
    [
      "Service providers that host our website and database, send emails, process payments (Paystack) and power our AI features — only as needed to provide the service.",
      "Our staff and instructors, limited to what they need for their role.",
      "Anyone verifying a certificate or enrollment you've shared — they see only a masked summary, not your contact details.",
      "Authorities, when the law requires it.",
    ],
  ]},
  { heading: "How long we keep it", body: [
    "We keep account, enrollment and certificate records while your account is active and for as long as needed to verify certificates and meet legal and accounting duties. Internship applications, form messages and AI chats are kept only as long as useful, then deleted. You can ask us to delete your data at any time.",
  ]},
  { heading: "Security", body: [
    "We protect data with encrypted connections, access rules that limit each person to their own records, role-based staff access, rate limiting, and private file storage. No system is perfectly secure, so please use a strong password and keep it to yourself.",
  ]},
  { heading: "Your rights", body: [
    "Under Ghana's Data Protection Act, 2012 (Act 843) and similar laws, you can ask to see, correct, download or delete your personal data, object to certain uses, and unsubscribe from marketing at any time. You can update most details in Profile Settings, or email us. You may also complain to the Data Protection Commission of Ghana.",
  ]},
  { heading: "Cookies and local storage", body: [
    "We use your browser's storage to keep you signed in and remember simple preferences such as your dashboard theme. We don't use advertising cookies.",
  ]},
  { heading: "Children", body: [
    "Our services are meant for people aged 16 and over. Younger learners may join only with a parent or guardian's permission. If you think a child has given us data without consent, contact us and we'll remove it.",
  ]},
  { heading: "Changes to this policy", body: [
    "We may update this policy. We'll change the date at the top and, for significant changes, let account holders know by email or on the site.",
  ]},
];

const PrivacyPolicy = () => (
  <LegalPage
    title="Privacy Policy"
    description="How Daryl Tech & Educational Network collects, uses and protects your personal information."
    path="/privacy"
    updated="2 October 2026"
    intro="This policy explains what personal information we collect when you use our website, courses, internships and Jael AI assistant, how we use it, and the choices you have."
    sections={sections}
  />
);

export default PrivacyPolicy;
