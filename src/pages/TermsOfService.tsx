import LegalPage, { type LegalSection } from "@/components/LegalPage";

const CONTACT = "daryltecheducationalnetwork@gmail.com";

const sections: LegalSection[] = [
  { heading: "Agreement", body: [
    "By using this website or any Daryl Tech services including courses, internships, bookings and the Jael AI assistant, you agree to these terms and to our Privacy Policy. If you don't agree, please don't use the services.",
  ]},
  { heading: "Accounts", body: [[
    "You must give accurate information and keep it up to date.",
    "Keep your password private. You're responsible for activity on your account.",
    "Staff may give you a temporary password; you must change it when you first sign in.",
    "Enrollment IDs (DTEN-) and staff IDs (STAFF-) are personal and must not be shared or misused.",
    "We may suspend or close accounts that break these terms or are inactive for long periods.",
  ]]},
  { heading: "Courses and enrollment", body: [
    "Course access is granted once your enrollment is confirmed. Content, schedules, deadlines and instructors may change to keep courses current. You get a personal, non-transferable right to use course materials for your own learning.",
  ]},
  { heading: "Fees and payments", body: [
    "Prices are shown in Ghana cedis (GHS) and paid through Paystack. Enrollment is confirmed only after payment is verified. Refund requests must be emailed to us within 7 days of payment and before you've completed more than 20% of the course; approved refunds go back to the original payment method. Fees for programmes already completed are not refundable.",
  ]},
  { heading: "Assignments, grading and certificates", body: [[
    "Work you submit must be your own. Plagiarism or cheating may lead to failing a task, losing a certificate, or removal from a course.",
    "AI feedback is a suggestion; final grades are decided by our staff.",
    "Certificates carry a unique verification number. We may revoke a certificate issued in error or obtained dishonestly.",
    "Anyone can verify a certificate or enrollment on our site; only limited, masked details are shown.",
  ]]},
  { heading: "Internships", body: [
    "Submitting an application does not guarantee a place. Each application is marked pending, approved or rejected, and we may give a reason. Our decisions are final. Approved interns may be asked to follow extra programme rules or sign an offer letter.",
  ]},
  { heading: "Jael AI assistant", body: [
    "Jael gives automated answers that may sometimes be wrong or incomplete. Don't rely on it for legal, financial or medical advice, and don't upload content you have no right to share or that contains sensitive personal data.",
  ]},
  { heading: "Acceptable use", body: [
    "You agree not to:",
    [
      "break the law or anyone's rights;",
      "upload harmful, offensive or misleading content, or malware;",
      "try to access other people's accounts or data, or get around our security;",
      "scrape, overload or disrupt the site;",
      "resell or republish our course content without permission.",
    ],
  ]},
  { heading: "Intellectual property", body: [
    "Our website, logo, course materials, videos and software belong to Daryl Tech or our licensors. You keep ownership of work you submit, but give us permission to store, review and grade it, and — with your consent — to showcase it.",
  ]},
  { heading: "Third-party services and links", body: [
    "We rely on outside services such as Paystack, Google, Apple and email providers, and link to other websites. We're not responsible for their content or practices.",
  ]},
  { heading: "Disclaimers and liability", body: [
    "We work hard to keep our services accurate and available, but provide them \"as is\" without guarantees of uninterrupted access or particular career results. To the extent the law allows, our total liability to you is limited to the amount you paid us in the 12 months before the claim.",
  ]},
  { heading: "Changes and termination", body: [
    "We may update these terms; the date at the top shows the latest version. Continuing to use the services means you accept the changes. You may stop using the services and ask us to close your account at any time.",
  ]},
  { heading: "Governing law and contact", body: [
    `These terms are governed by the laws of the Republic of Ghana, and disputes will be handled by the courts of Ghana. Questions? Email ${CONTACT} or call +233 50 914 7164.`,
  ]},
];

const TermsOfService = () => (
  <LegalPage
    title="Terms of Service"
    description="The terms for using Daryl Tech & Educational Network's website, courses, internships and AI assistant."
    path="/terms"
    updated="2 October 2026"
    intro="These terms set out the rules for using Daryl Tech's website and services. Please read them carefully."
    sections={sections}
  />
);

export default TermsOfService;
