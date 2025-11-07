// pages/about.js
import Link from 'next/link';

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <img 
            src="/images/RepQuestAlpha.png" 
            alt="RepQuest" 
            className="w-32 h-32 mx-auto mb-6"
          />
          <h1 className="text-5xl font-bold text-white mb-4">RepQuest</h1>
          <p className="text-xl text-blue-400">Gamified Training Platform</p>
        </div>

        {/* Main Content */}
        <div className="bg-gray-800 rounded-2xl p-8 md:p-12 border border-gray-700 shadow-2xl">
          <div className="prose prose-invert max-w-none">
            <p className="text-lg text-gray-300 leading-relaxed mb-6">
              RepQuest is a gamified training platform that transforms daily practice into a mission 
              kids actually want to complete. Young athletes choose drills, log reps, earn points, and 
              climb tiered ranks that celebrate consistency and effort, not just talent.
            </p>

            <p className="text-lg text-gray-300 leading-relaxed mb-6">
              In a world where youth sports are more competitive and structured than ever, but kids often 
              lack motivation and guidance outside team practice, RepQuest fills the gap by making 
              self-driven development fun, measurable, and rewarding.
            </p>

            <p className="text-lg text-gray-300 leading-relaxed mb-6">
              It blends habit-building psychology, clean data tracking, and competitive progress mechanics 
              so families and coaches can see real commitment, real improvement, and real growth.
            </p>

            <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-6 my-8">
              <p className="text-xl font-semibold text-blue-400 mb-4">
                This is not a checklist—it's a competitive training ecosystem built to unlock better 
                athletes and more confident kids, one rep at a time.
              </p>
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <div className="bg-gray-700/50 rounded-lg p-6">
                <div className="text-3xl mb-3">🎯</div>
                <h3 className="text-white font-semibold text-lg mb-2">Choose Your Drills</h3>
                <p className="text-gray-400 text-sm">
                  Select from coach-created exercises tailored to your sport and skill level
                </p>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-6">
                <div className="text-3xl mb-3">📊</div>
                <h3 className="text-white font-semibold text-lg mb-2">Track Progress</h3>
                <p className="text-gray-400 text-sm">
                  Log every rep and watch your improvement with clean, measurable data
                </p>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-6">
                <div className="text-3xl mb-3">⭐</div>
                <h3 className="text-white font-semibold text-lg mb-2">Earn Points</h3>
                <p className="text-gray-400 text-sm">
                  Build points through consistency and effort, celebrating every milestone
                </p>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-6">
                <div className="text-3xl mb-3">🏆</div>
                <h3 className="text-white font-semibold text-lg mb-2">Compete & Grow</h3>
                <p className="text-gray-400 text-sm">
                  Rise through the ranks and compete with teammates in a positive environment
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <Link 
              href="/"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-lg text-lg transition"
            >
              Get Started
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-gray-500 text-sm">
            RepQuest - One rep at a time
          </p>
        </div>
      </div>
    </div>
  );
}