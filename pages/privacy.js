// pages/privacy.js
export default function Privacy() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
            <div className="max-w-4xl mx-auto bg-gray-800 rounded-xl p-8 border border-gray-700">
                <h1 className="text-3xl font-bold text-white mb-4">RepQuest Privacy Policy</h1>

                <div className="text-gray-400 text-sm mb-6">
                    <strong>Effective Date:</strong> January 1, 2025<br />
                    <strong>Provider:</strong> Indie Effects (a pending Georgia limited liability company)
                </div>

                <div className="text-gray-300 space-y-6 leading-relaxed">
                    <p>
                        RepQuest values your privacy. This policy explains what data we collect, how we use it, and your rights.
                    </p>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">1. Information We Collect</h2>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li><strong>Account Information:</strong> Name, email, login credentials, and team association.</li>
                            <li><strong>Profile Images:</strong> Optional images for players, coaches, and teams.</li>
                            <li><strong>Activity Data:</strong> Drill completion, reps, points, timestamps, and leaderboard stats.</li>
                            <li><strong>Technical Data:</strong> Device type, browser info, IP address, and cookies for app performance.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">2. How We Use Your Information</h2>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Enable app functionality and account management.</li>
                            <li>Track and display player progress and leaderboards.</li>
                            <li>Improve the app experience and fix bugs.</li>
                            <li>Communicate important updates and app notices.</li>
                        </ul>
                        <p className="mt-3 font-semibold text-blue-400">
                            We do not sell or share personal data with advertisers or third parties except as required by law.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">3. Children Under 13</h2>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>The app may be used by children under 13 only with parental consent.</li>
                            <li>Parents/guardians create accounts on behalf of the child and agree to the Terms of Service and Waiver.</li>
                            <li>We do not knowingly collect data from children without parental permission.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">4. Sharing Information</h2>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Your optional profile images and stats are visible to your team and coaches.</li>
                            <li>Aggregate, anonymized data may be used for analytics, research, or app improvements.</li>
                            <li>We may share data if legally required or to protect the safety of users or the app.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">5. Data Security</h2>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>We implement reasonable technical and organizational measures to protect your data.</li>
                            <li>You are responsible for keeping your account credentials secure.</li>
                            <li>Despite security efforts, we cannot guarantee complete protection of data transmitted over the internet.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">6. Data Retention</h2>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>We retain personal data as long as the account is active or needed for app purposes.</li>
                            <li>You can request deletion of your account and personal data through your settings or contacting support.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">7. Your Rights</h2>
                        <p className="mb-2">Depending on your location, you may have:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>The right to access, correct, or delete your personal data.</li>
                            <li>The right to withdraw consent for data processing (for children, parent/guardian acts).</li>
                            <li>The right to limit or object to certain processing of your data.</li>
                        </ul>
                        <p className="mt-3">
                            Contact <a href="mailto:support@mantistimer.com" className="text-blue-400 hover:underline">support@mantistimer.com</a> for data-related requests.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">8. Changes to Privacy Policy</h2>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>We may update this policy from time to time.</li>
                            <li>Users will be notified in the app of material changes.</li>
                        </ul>
                    </section>

                    <section className="mt-8 pt-6 border-t border-gray-700">
                        <h2 className="text-xl font-bold text-white mb-3">9. Contact</h2>
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