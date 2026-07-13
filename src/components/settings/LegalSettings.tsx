import { useState } from "react";
import { ChevronRightIcon, FileTextIcon, ShieldCheckIcon, ScaleIcon, ArrowLeftIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type PolicyType = "privacy" | "terms" | "security" | null;

export function LegalSettings() {
  const [activePolicy, setActivePolicy] = useState<PolicyType>(null);

  return (
    <div className="relative overflow-hidden h-full">
      <AnimatePresence mode="wait">
        {activePolicy === "privacy" && (
          <motion.section 
            key="privacy"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="settings-detail-section h-full overflow-y-auto"
          >
            <header className="flex items-center gap-2 mb-6">
              <button 
                onClick={() => setActivePolicy(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors active:scale-95"
                aria-label="Go back"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div>
                <p className="type-group-label">Legal & Privacy</p>
                <h2 className="text-[20px] font-bold tracking-tight text-foreground">Privacy Policy</h2>
              </div>
            </header>

            <div className="bg-elevated border border-separator/50 rounded-[20px] p-6 md:p-8 shadow-sm">
              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                <p className="text-foreground font-medium mb-6">Effective Date: January 1, 2026</p>
                
                <p>At Telkar Vault, your privacy is our highest priority. We are committed to complying with global and regional data protection laws, including the <strong>India Digital Personal Data Protection (DPDP) Act, 2023</strong>, the <strong>General Data Protection Regulation (GDPR)</strong>, and the <strong>California Consumer Privacy Act (CCPA)</strong>.</p>
                
                <h3 className="text-foreground text-[16px] font-semibold mt-8 mb-3">Zero-Knowledge Architecture</h3>
                <p>Telkar Vault operates on a strict zero-knowledge architecture. This means your vault data (passwords, secure notes, bank details) is encrypted and decrypted locally on your device using your Master Password. We never receive, store, or have the ability to view your Master Password or the unencrypted contents of your vault.</p>

                <h3 className="text-foreground text-[16px] font-semibold mt-8 mb-3">Data We Collect</h3>
                <p>Due to our zero-knowledge architecture, the personal data we process is strictly limited to what is necessary to provide the service:</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Your email address (for account identification and communication).</li>
                  <li>Encrypted vault blobs (which we cannot decrypt or read).</li>
                  <li>Basic analytics and diagnostic data (anonymized, to improve service reliability).</li>
                </ul>

                <h3 className="text-foreground text-[16px] font-semibold mt-8 mb-3">Your Rights (DPDP, GDPR, CCPA)</h3>
                <p>Depending on your jurisdiction, you have the following rights regarding your personal data:</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li><strong>Right to Access & Portability:</strong> You can export your entire vault data at any time from the "Data & Backup" settings.</li>
                  <li><strong>Right to Erasure (Right to be Forgotten):</strong> You can permanently delete your account and all associated encrypted data from the "Danger Zone" settings. Once deleted, this data cannot be recovered.</li>
                  <li><strong>Right to Correction:</strong> You can update your account information (like your email address) directly within the app.</li>
                  <li><strong>Right of Nomination (DPDP):</strong> You have the right to nominate an individual to act on your behalf in the event of death or incapacity (handled via external support request).</li>
                </ul>

                <div className="mt-10 pt-6 border-t border-separator/50">
                  <p className="text-sm">
                    If you have questions about our privacy practices, please contact our Data Protection Officer at <strong>privacy@telkar.com</strong>.
                  </p>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {activePolicy === "terms" && (
          <motion.section 
            key="terms"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="settings-detail-section h-full overflow-y-auto"
          >
            <header className="flex items-center gap-2 mb-6">
              <button 
                onClick={() => setActivePolicy(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors active:scale-95"
                aria-label="Go back"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div>
                <p className="type-group-label">Legal & Privacy</p>
                <h2 className="text-[20px] font-bold tracking-tight text-foreground">Terms of Service</h2>
              </div>
            </header>

            <div className="bg-elevated border border-separator/50 rounded-[20px] p-6 md:p-8 shadow-sm">
              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                <p className="text-foreground font-medium mb-6">Effective Date: January 1, 2026</p>
                <p>Welcome to Telkar Vault. By using our application, you agree to these Terms of Service. Please read them carefully.</p>
                
                <h3 className="text-foreground text-[16px] font-semibold mt-8 mb-3">1. Use of Service</h3>
                <p>You agree to use Telkar Vault only for lawful purposes. You are responsible for maintaining the confidentiality of your Master Password. Because we use a zero-knowledge architecture, <strong>we cannot recover your data if you lose your Master Password.</strong></p>

                <h3 className="text-foreground text-[16px] font-semibold mt-8 mb-3">2. Acceptable Use</h3>
                <p>You must not use our service to store illegal content, distribute malware, or engage in activities that compromise the security and availability of the service.</p>

                <h3 className="text-foreground text-[16px] font-semibold mt-8 mb-3">3. Limitation of Liability</h3>
                <p>Telkar Vault is provided "as is" without warranties of any kind. We are not liable for data loss resulting from forgotten Master Passwords, compromised devices, or user error.</p>

                <h3 className="text-foreground text-[16px] font-semibold mt-8 mb-3">4. Termination</h3>
                <p>We reserve the right to suspend or terminate your account if you violate these Terms. You may terminate your account at any time by using the "Delete Account" feature.</p>
              </div>
            </div>
          </motion.section>
        )}

        {activePolicy === "security" && (
          <motion.section 
            key="security"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="settings-detail-section h-full overflow-y-auto"
          >
            <header className="flex items-center gap-2 mb-6">
              <button 
                onClick={() => setActivePolicy(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors active:scale-95"
                aria-label="Go back"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div>
                <p className="type-group-label">Legal & Privacy</p>
                <h2 className="text-[20px] font-bold tracking-tight text-foreground">Security Architecture</h2>
              </div>
            </header>

            <div className="bg-elevated border border-separator/50 rounded-[20px] p-6 md:p-8 shadow-sm">
              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                <p className="mb-6">Our security model ensures that you are the only one who holds the keys to your data.</p>
                
                <ul className="list-disc pl-5 space-y-4">
                  <li>
                    <strong className="text-foreground">Client-Side Encryption:</strong><br/>
                    All encryption and decryption happen locally on your device. Your unencrypted data never leaves your browser.
                  </li>
                  <li>
                    <strong className="text-foreground">Encryption Standards:</strong><br/>
                    We use industry-standard AES-256-GCM encryption for all vault items, ensuring authenticated encryption.
                  </li>
                  <li>
                    <strong className="text-foreground">Key Derivation:</strong><br/>
                    Your encryption key is derived from your Master Password using PBKDF2 (or Argon2) with a high iteration count and a unique cryptographic salt to protect against dictionary and brute-force attacks.
                  </li>
                  <li>
                    <strong className="text-foreground">Secure Communication:</strong><br/>
                    All data transmitted between your device and our servers is secured using TLS 1.3 to prevent man-in-the-middle attacks.
                  </li>
                </ul>
              </div>
            </div>
          </motion.section>
        )}

        {activePolicy === null && (
          <motion.section 
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="settings-detail-section h-full overflow-y-auto"
            aria-labelledby="settings-legal-title"
          >
            <header>
              <p className="type-group-label">Telkar Vault</p>
              <h2 id="settings-legal-title">Legal & Privacy</h2>
              <p>Policies regarding your data, privacy, and our terms of service.</p>
            </header>

            <div className="apple-grouped-list">
              {/* Privacy Policy */}
              <button
                type="button"
                onClick={() => setActivePolicy("privacy")}
                className="settings-control-row w-full text-left bg-transparent border-0 cursor-pointer system-interactive select-none hover:bg-secondary/40 transition-colors active:scale-[0.98]"
              >
                <span className="settings-row-icon bg-blue-500/15 text-blue-600 dark:text-blue-400">
                  <ShieldCheckIcon aria-hidden="true" className="w-5 h-5" />
                </span>
                <span>
                  <strong>Privacy Policy</strong>
                  <small>DPDP, GDPR & CCPA Compliance</small>
                </span>
                <div className="flex justify-end">
                  <ChevronRightIcon className="w-5 h-5 text-muted-foreground/50" />
                </div>
              </button>

              {/* Terms of Service */}
              <button
                type="button"
                onClick={() => setActivePolicy("terms")}
                className="settings-control-row w-full text-left bg-transparent border-0 cursor-pointer system-interactive select-none hover:bg-secondary/40 transition-colors active:scale-[0.98]"
              >
                <span className="settings-row-icon bg-orange-500/15 text-orange-600 dark:text-orange-400">
                  <FileTextIcon aria-hidden="true" className="w-5 h-5" />
                </span>
                <span>
                  <strong>Terms of Service</strong>
                  <small>Usage rules and limitations</small>
                </span>
                <div className="flex justify-end">
                  <ChevronRightIcon className="w-5 h-5 text-muted-foreground/50" />
                </div>
              </button>

              {/* Security & Architecture */}
              <button
                type="button"
                onClick={() => setActivePolicy("security")}
                className="settings-control-row w-full text-left bg-transparent border-0 cursor-pointer system-interactive select-none hover:bg-secondary/40 transition-colors active:scale-[0.98]"
              >
                <span className="settings-row-icon bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <ScaleIcon aria-hidden="true" className="w-5 h-5" />
                </span>
                <span>
                  <strong>Security Architecture</strong>
                  <small>Encryption and technical standards</small>
                </span>
                <div className="flex justify-end">
                  <ChevronRightIcon className="w-5 h-5 text-muted-foreground/50" />
                </div>
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
