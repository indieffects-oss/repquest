// pages/terms.js
export default function Terms() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
            <div className="max-w-4xl mx-auto bg-gray-800 rounded-xl p-8 border border-gray-700">
                <h1 className="text-3xl font-bold text-white mb-4">RepQuest Terms of Service & Liability Waiver</h1>

                <div className="text-gray-400 text-sm mb-6">
                    <strong>Effective Date:</strong> January 1, 2025<br />
                    <strong>Provider:</strong> Indie Effects (a pending Georgia limited liability company)
                </div>

                <div className="text-gray-300 space-y-6 leading-relaxed">
                    <p>
                        By creating an account or using RepQuest, you agree to these Terms of Service and the Liability Waiver.
                        If you are under 13, a parent or guardian must create your account and agree on your behalf.
                    </p>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
                        <p>
                            RepQuest provides online tools for sports teams to practice, track progress, and participate in drills.
                            By using the app, you agree to follow these terms and any additional rules posted in the app.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">2. Eligibility</h2>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Users must be at least 13 years old, or have a parent/guardian account.</li>
                            <li>Coaches are responsible for supervising minors and ensuring safe participation.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">3. Account Responsibilities</h2>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Keep your login info secure.</li>
                            <li>You are responsible for all activity under your account.</li>
                            <li>Provide accurate information in profiles and team pages.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">4. Assumption of Risk & Liability Waiver</h2>
                        <p className="mb-3">By using RepQuest:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>You understand that physical exercise carries inherent risks, including injury.</li>
                            <li>You participate at your own risk and are responsible for your own safety and that of any minors you supervise.</li>
                            <li>RepQuest, Indie Effects, and affiliated parties are not responsible for injuries, accidents, or medical issues.</li>
                            <li>You are responsible for any personal property damage (phones, equipment, etc.) while using the app or performing drills.</li>
                        </ul>
                        <p className="mt-3 font-semibold text-yellow-400">
                            You hereby release, waive, and hold harmless RepQuest, Indie Effects, and affiliates from any claims,
                            costs, or damages arising from use of the app or participation in drills.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">5. Coach & Team Responsibilities</h2>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Coaches should ensure drills are appropriate for participants' skill levels and abilities.</li>
                            <li>Coaches should provide supervision for minors at all times.</li>
                            <li>Teams and coaches must follow all applicable local rules and safety guidelines.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">6. Intellectual Property</h2>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>RepQuest, its logos, graphics, app content, and software are owned exclusively by Indie Effects.</li>
                            <li>You may not copy, reproduce, modify, distribute, create derivative works, or use our content for competing apps or commercial purposes.</li>
                            <li>Any links, drills, or user-generated content remain under your responsibility; you grant RepQuest a license to display them in the app.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">7. Privacy & Data</h2>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>RepQuest collects stats, login info, profile images, and team images for app functionality.</li>
                            <li>Data is used only for running the app, showing leaderboards, and account management.</li>
                            <li>Optional profile images are visible to team members and coaches.</li>
                            <li>RepQuest does not sell your data to third parties. For more details, see our <a href="/privacy" className="text-blue-400 hover:underline">Privacy Policy</a>.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">8. Prohibited Conduct</h2>
                        <p className="mb-2">You may not:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Hack, reverse engineer, or interfere with the app.</li>
                            <li>Harass, bully, or abuse other users.</li>
                            <li>Use the app for illegal purposes.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">9. Termination</h2>
                        <p>
                            RepQuest may suspend or terminate accounts for violations of these terms without notice.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">10. Disclaimers & Limitation of Liability</h2>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>The app is provided "as is" and "as available."</li>
                            <li>Indie Effects makes no guarantees of safety, accuracy, or fitness for any particular purpose.</li>
                            <li>Liability is limited to the maximum extent allowed by law; you assume all risks of use.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">11. Governing Law & Disputes</h2>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>These terms are governed by Georgia law.</li>
                            <li>Any disputes will be resolved in Georgia courts.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">12. Changes to Terms</h2>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>RepQuest may update these terms.</li>
                            <li>Continued use after updates constitutes acceptance of the new terms.</li>
                        </ul>
                    </section>

                    <section className="mt-8 pt-6 border-t border-gray-700">
                        <h2 className="text-xl font-bold text-white mb-3">Contact</h2>
                        <p>
                            Indie Effects<br />
                            Email: <a href="mailto:support@mantistimer.com" className="text-blue-400 hover:underline">support@mantistimer.com</a>
                        </p>
                    </section>
                </div>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => window.close()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}