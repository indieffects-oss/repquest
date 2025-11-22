export default function handler(req, res) {
    res.status(200).json({
        hasResendKey: !!process.env.RESEND_API_KEY,
        keyLength: process.env.RESEND_API_KEY?.length || 0,
        allEnvKeys: Object.keys(process.env).filter(k => k.includes('RESEND'))
    });
}