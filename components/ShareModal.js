// components/ShareModal.js - v0.44 FIXED alignment & QR
import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';

export default function ShareModal({
    isOpen,
    onClose,
    shareData,
    teamColors = { primary: '#3B82F6', secondary: '#1E40AF' },
    userName,
    teamName
}) {
    const [generating, setGenerating] = useState(false);
    const [imageUrl, setImageUrl] = useState(null);
    const [qrDataUrl, setQrDataUrl] = useState(null);
    const cardRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            // Pre-load QR as base64
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 140; // 2x for retina
                canvas.height = 140;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, 140, 140);
                ctx.drawImage(img, 0, 0, 140, 140);
                const dataUrl = canvas.toDataURL('image/png');
                setQrDataUrl(dataUrl);

                // Wait longer for QR to be in DOM
                setTimeout(() => {
                    if (cardRef.current && !imageUrl) {
                        generateImage();
                    }
                }, 400);
            };
            img.onerror = () => {
                console.error('Failed to load QR code');
                // Try without QR
                setTimeout(() => {
                    if (cardRef.current && !imageUrl) {
                        generateImage();
                    }
                }, 400);
            };
            img.src = '/images/RQ-QR.png';
        }
    }, [isOpen]);

    const generateImage = async () => {
        setGenerating(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 300));

            const canvas = await html2canvas(cardRef.current, {
                backgroundColor: null,
                scale: 2,
                logging: false,
                useCORS: true,
                allowTaint: false,
                imageTimeout: 0
            });

            const url = canvas.toDataURL('image/png');
            setImageUrl(url);
        } catch (err) {
            console.error('Error generating image:', err);
        } finally {
            setGenerating(false);
        }
    };

    const downloadImage = () => {
        if (!imageUrl) return;

        const link = document.createElement('a');
        link.download = `repquest-${shareData?.type}-${Date.now()}.png`;
        link.href = imageUrl;
        link.click();
    };

    const shareToSocial = async (platform) => {
        const text = shareData?.shareText || 'Check out my progress on RepQuest!';
        const url = 'https://RepQuest.MANTIStimer.com';

        if (platform === 'instagram' || platform === 'tiktok') {
            downloadImage();
            try {
                await navigator.clipboard.writeText(`${text}\n\n${url}`);
                alert(`✅ Image downloaded and text copied!\n\nNow:\n1. Open ${platform === 'instagram' ? 'Instagram' : 'TikTok'} app\n2. Create new post\n3. Upload the downloaded image\n4. Paste the copied caption`);
            } catch (err) {
                alert(`Image downloaded! Share it on ${platform === 'instagram' ? 'Instagram' : 'TikTok'} with this text:\n\n${text}\n\n${url}`);
            }
        } else {
            const urls = {
                twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
                facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`
            };

            if (urls[platform]) {
                window.open(urls[platform], '_blank', 'width=600,height=400');
            }
        }
    };

    const copyImage = async () => {
        if (!imageUrl) return;

        try {
            const blob = await (await fetch(imageUrl)).blob();
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            alert('Image copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy:', err);
            alert('Could not copy image. Try downloading instead.');
        }
    };

    if (!isOpen || !shareData) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
            <div className="bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-700">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-white">Share Your Achievement</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white text-2xl"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Preview Card */}
                    <div className="bg-gray-900 rounded-lg p-3 mb-6 flex justify-center">
                        <div
                            ref={cardRef}
                            style={{
                                background: `linear-gradient(180deg, ${teamColors.primary} 0%, ${teamColors.secondary} 100%)`,
                                width: '360px',
                                height: '640px',
                                borderRadius: '20px',
                                padding: '0',
                                color: 'white',
                                display: 'flex',
                                flexDirection: 'column',
                                position: 'relative'
                            }}
                        >
                            {/* Top Section - SMALLER PADDING */}
                            <div style={{
                                padding: '20px 30px 10px 30px',
                                textAlign: 'center'
                            }}>
                                <div style={{
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    opacity: 0.9,
                                    marginBottom: '6px'
                                }}>
                                    {teamName || 'RepQuest'}
                                </div>
                                <div style={{
                                    height: '3px',
                                    width: '60px',
                                    background: 'rgba(255,255,255,0.4)',
                                    borderRadius: '9999px',
                                    margin: '0 auto'
                                }}></div>
                            </div>

                            {/* Main Content - ABSOLUTE POSITIONING */}
                            <div style={{
                                position: 'absolute',
                                top: '80px',
                                left: '30px',
                                right: '30px',
                                bottom: '120px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                textAlign: 'center'
                            }}>
                                {shareData.type === 'levelup' && (
                                    <>
                                        <div style={{ fontSize: '64px', marginBottom: '12px' }}>{shareData.emoji}</div>
                                        <div style={{
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            opacity: 0.85,
                                            marginBottom: '16px'
                                        }}>
                                            {userName} just leveled up!
                                        </div>
                                        <div style={{
                                            background: 'rgba(255,255,255,0.15)',
                                            borderRadius: '16px',
                                            padding: '20px',
                                            marginBottom: '16px',
                                            border: '2px solid rgba(255,255,255,0.3)'
                                        }}>
                                            <div style={{
                                                fontSize: '80px',
                                                fontWeight: '900',
                                                marginBottom: '8px',
                                                textShadow: '0 0 30px rgba(255,255,255,0.3)'
                                            }}>
                                                {shareData.level}
                                            </div>
                                            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                                                {shareData.tierName}
                                            </div>
                                        </div>

                                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '10px' }}>
                                            <tbody>
                                                <tr>
                                                    <td style={{
                                                        background: 'rgba(255,255,255,0.2)',
                                                        borderRadius: '12px',
                                                        padding: '12px',
                                                        textAlign: 'center'
                                                    }}>
                                                        <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
                                                            {shareData.totalPoints?.toLocaleString() || 0}
                                                        </div>
                                                        <div style={{ fontSize: '9px', opacity: 0.85 }}>Total Points</div>
                                                    </td>
                                                    <td style={{
                                                        background: 'rgba(255,255,255,0.2)',
                                                        borderRadius: '12px',
                                                        padding: '12px',
                                                        textAlign: 'center'
                                                    }}>
                                                        <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
                                                            {shareData.totalReps?.toLocaleString() || 0}
                                                        </div>
                                                        <div style={{ fontSize: '9px', opacity: 0.85 }}>Total Reps</div>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </>
                                )}

                                {shareData.type === 'badge' && (
                                    <>
                                        <div style={{
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            opacity: 0.85,
                                            marginBottom: '12px'
                                        }}>
                                            {userName} earned a badge!
                                        </div>
                                        <div style={{
                                            background: 'rgba(255,255,255,0.15)',
                                            borderRadius: '20px',
                                            padding: '26px',
                                            marginBottom: '16px',
                                            border: '2px solid rgba(255,255,255,0.3)'
                                        }}>
                                            <div style={{
                                                fontSize: '80px',
                                                marginBottom: '12px',
                                                textShadow: '0 0 30px rgba(255,255,255,0.3)'
                                            }}>
                                                {shareData.badgeIcon}
                                            </div>
                                            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
                                                {shareData.badgeName}
                                            </div>
                                            <div style={{ fontSize: '11px', opacity: 0.85 }}>
                                                {shareData.badgeDescription}
                                            </div>
                                        </div>

                                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '10px' }}>
                                            <tbody>
                                                <tr>
                                                    <td style={{
                                                        background: 'rgba(255,255,255,0.2)',
                                                        borderRadius: '12px',
                                                        padding: '12px',
                                                        textAlign: 'center'
                                                    }}>
                                                        <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
                                                            {shareData.totalBadges || 1}
                                                        </div>
                                                        <div style={{ fontSize: '9px', opacity: 0.85 }}>Badges Earned</div>
                                                    </td>
                                                    <td style={{
                                                        background: 'rgba(255,255,255,0.2)',
                                                        borderRadius: '12px',
                                                        padding: '12px',
                                                        textAlign: 'center'
                                                    }}>
                                                        <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
                                                            Lvl {shareData.level || 0}
                                                        </div>
                                                        <div style={{ fontSize: '9px', opacity: 0.85 }}>Current Level</div>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </>
                                )}

                                {shareData.type === 'sixtyseven' && (
                                    <>
                                        <div style={{
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            opacity: 0.85,
                                            marginBottom: '12px'
                                        }}>
                                            {userName} hit the lucky number!
                                        </div>
                                        <div style={{
                                            background: 'rgba(250,204,21,0.2)',
                                            borderRadius: '20px',
                                            padding: '30px',
                                            marginBottom: '12px',
                                            border: '4px solid rgba(250,204,21,0.5)'
                                        }}>
                                            <div style={{
                                                fontSize: '80px',
                                                fontWeight: '900',
                                                color: 'rgb(253, 224, 71)',
                                                marginBottom: '12px',
                                                textShadow: '0 0 30px rgba(250,204,21,0.5)'
                                            }}>
                                                6️⃣7️⃣
                                            </div>
                                            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'rgb(253, 224, 71)' }}>
                                                SIX SEVEN!
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '16px', fontWeight: '600', marginTop: '12px', opacity: 0.9 }}>
                                            🎰 Lucky Number Achievement 🎰
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Bottom Section - ABSOLUTE */}
                            <div style={{
                                position: 'absolute',
                                bottom: '25px',
                                left: '30px',
                                right: '30px'
                            }}>
                                <table style={{ width: '100%' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ verticalAlign: 'bottom', width: '60%' }}>
                                                <div style={{ fontSize: '20px', fontWeight: '900', marginBottom: '4px' }}>
                                                    RepQuest
                                                </div>
                                                <div style={{ fontSize: '9px', fontWeight: '600', opacity: 0.7 }}>
                                                    RepQuest.MANTIStimer.com
                                                </div>
                                            </td>
                                            <td style={{ verticalAlign: 'bottom', textAlign: 'right', width: '40%' }}>
                                                {qrDataUrl && (
                                                    <div style={{
                                                        background: 'white',
                                                        padding: '8px',
                                                        borderRadius: '12px',
                                                        display: 'inline-block',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                                    }}>
                                                        <img
                                                            src={qrDataUrl}
                                                            alt="QR"
                                                            style={{
                                                                width: '70px',
                                                                height: '70px',
                                                                display: 'block',
                                                                imageRendering: 'pixelated'
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={downloadImage}
                                disabled={generating}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                            >
                                📥 Download
                            </button>
                            <button
                                onClick={copyImage}
                                disabled={generating}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                            >
                                📋 Copy
                            </button>
                        </div>

                        <div className="text-center text-gray-400 text-sm">Share to:</div>

                        <div className="grid grid-cols-4 gap-3">
                            <button
                                onClick={() => shareToSocial('twitter')}
                                className="bg-black hover:bg-gray-900 text-white p-4 rounded-lg transition-all flex items-center justify-center"
                            >
                                <svg className="w-8 h-8" fill="white" viewBox="0 0 24 24">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                            </button>

                            <button
                                onClick={() => shareToSocial('facebook')}
                                className="bg-[#1877F2] hover:bg-[#166fe5] text-white p-4 rounded-lg transition-all flex items-center justify-center"
                            >
                                <svg className="w-8 h-8" fill="white" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                            </button>

                            <button
                                onClick={() => shareToSocial('instagram')}
                                className="bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 hover:opacity-90 text-white p-4 rounded-lg transition-all flex items-center justify-center"
                            >
                                <svg className="w-8 h-8" fill="white" viewBox="0 0 24 24">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                                </svg>
                            </button>

                            <button
                                onClick={() => shareToSocial('tiktok')}
                                className="bg-black hover:bg-gray-900 text-white p-4 rounded-lg transition-all flex items-center justify-center"
                            >
                                <svg className="w-8 h-8" fill="white" viewBox="0 0 24 24">
                                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0011.14-4.02v-6.95a8.16 8.16 0 004.65 1.46v-3.4a4.84 4.84 0 01-1.2-.5z" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {generating && (
                        <div className="text-center text-gray-400 text-sm mt-4">
                            Generating image...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}