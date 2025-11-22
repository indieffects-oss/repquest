// components/ShareModal.js - v0.5 Canvas-based rendering
import { useState, useRef, useEffect } from 'react';

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
    const canvasRef = useRef(null);

    useEffect(() => {
        if (isOpen && shareData) {
            generateCanvasImage();
        }
    }, [isOpen, shareData]);

    const loadImage = (src) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    };

    const drawRoundedRect = (ctx, x, y, width, height, radius) => {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    };

    const drawCircularImage = (ctx, img, x, y, radius) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // Calculate dimensions to cover the circle
        const scale = Math.max(radius * 2 / img.width, radius * 2 / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const offsetX = x - w / 2;
        const offsetY = y - h / 2;

        ctx.drawImage(img, offsetX, offsetY, w, h);
        ctx.restore();

        // Border
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 4;
        ctx.stroke();
    };

    const wrapText = (ctx, text, maxWidth) => {
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + " " + word).width;
            if (width < maxWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    };

    const generateCanvasImage = async () => {
        setGenerating(true);
        try {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const width = 720; // 2x for retina
            const height = 1280;

            canvas.width = width;
            canvas.height = height;

            // Gradient background
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, teamColors.primary);
            gradient.addColorStop(1, teamColors.secondary);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            // Load QR code
            let qrImage;
            try {
                qrImage = await loadImage('/images/RQ-QR.png');
            } catch (err) {
                console.error('Failed to load QR:', err);
            }

            // Load profile picture
            let profileImage;
            if (shareData.profilePicture) {
                try {
                    profileImage = await loadImage(shareData.profilePicture);
                } catch (err) {
                    console.error('Failed to load profile picture:', err);
                }
            }

            // Top section
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = 'bold 22px Arial';
            ctx.textAlign = 'center';
            ctx.fillText((teamName || 'RepQuest').toUpperCase(), width / 2, 70);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillRect(width / 2 - 60, 85, 120, 6);

            // Draw content based on type
            if (shareData.type === 'trophy_case') {
                await drawTrophyCase(ctx, width, height, profileImage);
            } else if (shareData.type === 'levelup') {
                await drawLevelUp(ctx, width, height, profileImage);
            } else if (shareData.type === 'badge') {
                await drawBadge(ctx, width, height, profileImage);
            } else if (shareData.type === 'sixtyseven') {
                await drawSixtySeven(ctx, width, height, profileImage);
            }

            // Bottom branding
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.font = 'bold 40px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('RepQuest', 60, height - 100);

            ctx.font = '18px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillText('RepQuest.MANTIStimer.com', 60, height - 70);

            // QR Code
            if (qrImage) {
                const qrSize = 140;
                const qrX = width - qrSize - 60;
                const qrY = height - qrSize - 50;

                ctx.fillStyle = 'white';
                drawRoundedRect(ctx, qrX - 16, qrY - 16, qrSize + 32, qrSize + 32, 24);
                ctx.fill();

                ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
            }

            const dataUrl = canvas.toDataURL('image/png', 1.0);
            setImageUrl(dataUrl);
        } catch (err) {
            console.error('Error generating image:', err);
        } finally {
            setGenerating(false);
        }
    };

    const drawTrophyCase = async (ctx, width, height, profileImage) => {
        if (profileImage) {
            drawCircularImage(ctx, profileImage, width / 2, 200, 80);
        }

        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(userName, width / 2, 320);

        ctx.font = 'bold 48px Arial';
        ctx.fillText('🏆 Trophy Case', width / 2, 390);

        // Level box
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        drawRoundedRect(ctx, 60, 430, width - 120, 140, 32);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.font = '80px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText(shareData.tierEmoji, width / 2, 520);

        ctx.font = 'bold 48px Arial';
        ctx.fillText(`Level ${shareData.level}`, width / 2, 570);

        // Stats grid
        const statsY = 620;
        const statWidth = (width - 180) / 2;

        // Points
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        drawRoundedRect(ctx, 60, statsY, statWidth, 100, 24);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 40px Arial';
        ctx.fillText(shareData.totalPoints.toLocaleString(), 60 + statWidth / 2, statsY + 50);
        ctx.font = '18px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText('Points', 60 + statWidth / 2, statsY + 80);

        // Reps
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        drawRoundedRect(ctx, width - 60 - statWidth, statsY, statWidth, 100, 24);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 40px Arial';
        ctx.fillText(shareData.totalReps.toLocaleString(), width - 60 - statWidth / 2, statsY + 50);
        ctx.font = '18px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText('Reps', width - 60 - statWidth / 2, statsY + 80);

        // Drills & Badges
        const stats2Y = statsY + 120;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        drawRoundedRect(ctx, 60, stats2Y, statWidth, 100, 24);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 40px Arial';
        ctx.fillText(shareData.totalDrills.toString(), 60 + statWidth / 2, stats2Y + 50);
        ctx.font = '18px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText('Drills', 60 + statWidth / 2, stats2Y + 80);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        drawRoundedRect(ctx, width - 60 - statWidth, stats2Y, statWidth, 100, 24);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 40px Arial';
        ctx.fillText(shareData.totalBadges.toString(), width - 60 - statWidth / 2, stats2Y + 50);
        ctx.font = '18px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText('Badges', width - 60 - statWidth / 2, stats2Y + 80);

        // Streak
        const streakY = stats2Y + 130;
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText(`🔥 ${shareData.currentStreak} Day Streak`, width / 2, streakY);
    };

    const drawLevelUp = async (ctx, width, height, profileImage) => {
        if (profileImage) {
            drawCircularImage(ctx, profileImage, width / 2, 220, 70);
        }

        ctx.font = '120px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        ctx.fillText(shareData.emoji, width / 2, 360);

        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText(`${userName} leveled up!`, width / 2, 420);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        drawRoundedRect(ctx, 90, 460, width - 180, 180, 32);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.font = 'bold 140px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText(shareData.level.toString(), width / 2, 570);

        ctx.font = 'bold 44px Arial';
        ctx.fillText(shareData.tierName, width / 2, 625);

        const statsY = 690;
        const statWidth = (width - 180) / 2;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        drawRoundedRect(ctx, 60, statsY, statWidth, 100, 24);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 40px Arial';
        ctx.fillText(shareData.totalPoints.toLocaleString(), 60 + statWidth / 2, statsY + 50);
        ctx.font = '18px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText('Total Points', 60 + statWidth / 2, statsY + 80);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        drawRoundedRect(ctx, width - 60 - statWidth, statsY, statWidth, 100, 24);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 40px Arial';
        ctx.fillText(shareData.totalReps.toLocaleString(), width - 60 - statWidth / 2, statsY + 50);
        ctx.font = '18px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText('Total Reps', width - 60 - statWidth / 2, statsY + 80);
    };

    const drawBadge = async (ctx, width, height, profileImage) => {
        if (profileImage) {
            drawCircularImage(ctx, profileImage, width / 2, 200, 70);
        }

        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText(`${userName} earned a badge!`, width / 2, 310);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        drawRoundedRect(ctx, 90, 360, width - 180, 280, 40);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.font = '140px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText(shareData.badgeIcon, width / 2, 490);

        ctx.font = 'bold 44px Arial';
        ctx.fillText(shareData.badgeName, width / 2, 560);

        ctx.font = '20px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        const descLines = wrapText(ctx, shareData.badgeDescription, width - 220);
        descLines.forEach((line, i) => {
            ctx.fillText(line, width / 2, 600 + i * 28);
        });

        const statsY = 710;
        const statWidth = (width - 180) / 2;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        drawRoundedRect(ctx, 60, statsY, statWidth, 100, 24);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 40px Arial';
        ctx.fillText(shareData.totalBadges.toString(), 60 + statWidth / 2, statsY + 50);
        ctx.font = '18px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText('Badges Earned', 60 + statWidth / 2, statsY + 80);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        drawRoundedRect(ctx, width - 60 - statWidth, statsY, statWidth, 100, 24);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 40px Arial';
        ctx.fillText(`Lvl ${shareData.level}`, width - 60 - statWidth / 2, statsY + 50);
        ctx.font = '18px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText('Current Level', width - 60 - statWidth / 2, statsY + 80);
    };

    const drawSixtySeven = async (ctx, width, height, profileImage) => {
        if (profileImage) {
            drawCircularImage(ctx, profileImage, width / 2, 220, 70);
        }

        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText(`${userName} hit the lucky number!`, width / 2, 330);

        ctx.fillStyle = 'rgba(250, 204, 21, 0.2)';
        drawRoundedRect(ctx, 90, 390, width - 180, 260, 40);
        ctx.fill();
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.5)';
        ctx.lineWidth = 8;
        ctx.stroke();

        ctx.font = 'bold 140px Arial';
        ctx.fillStyle = 'rgb(253, 224, 71)';
        ctx.fillText('6️⃣7️⃣', width / 2, 530);

        ctx.font = 'bold 52px Arial';
        ctx.fillText('SIX SEVEN!', width / 2, 610);

        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText('🎰 Lucky Number Achievement 🎰', width / 2, 710);
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
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
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
                        <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">✕</button>
                    </div>

                    <div className="bg-gray-900 rounded-lg p-3 mb-6 flex justify-center">
                        {imageUrl ? (
                            <img src={imageUrl} alt="Share preview" className="w-full max-w-[360px] rounded-lg" />
                        ) : (
                            <div className="w-full max-w-[360px] aspect-[9/16] bg-gray-700 rounded-lg flex items-center justify-center text-white">
                                Generating...
                            </div>
                        )}
                    </div>

                    <canvas ref={canvasRef} style={{ display: 'none' }} />

                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={downloadImage} disabled={generating || !imageUrl}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold">
                                📥 Download
                            </button>
                            <button onClick={copyImage} disabled={generating || !imageUrl}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold">
                                📋 Copy
                            </button>
                        </div>

                        <div className="text-center text-gray-400 text-sm">Share to:</div>

                        <div className="grid grid-cols-4 gap-3">
                            <button onClick={() => shareToSocial('twitter')}
                                className="bg-black hover:bg-gray-900 text-white p-4 rounded-lg">
                                <svg className="w-8 h-8" fill="white" viewBox="0 0 24 24">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                            </button>
                            <button onClick={() => shareToSocial('facebook')}
                                className="bg-[#1877F2] hover:bg-[#166fe5] text-white p-4 rounded-lg">
                                <svg className="w-8 h-8" fill="white" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                            </button>
                            <button onClick={() => shareToSocial('instagram')}
                                className="bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 text-white p-4 rounded-lg">
                                <svg className="w-8 h-8" fill="white" viewBox="0 0 24 24">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                                </svg>
                            </button>
                            <button onClick={() => shareToSocial('tiktok')}
                                className="bg-black hover:bg-gray-900 text-white p-4 rounded-lg">
                                <svg className="w-8 h-8" fill="white" viewBox="0 0 24 24">
                                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0011.14-4.02v-6.95a8.16 8.16 0 004.65 1.46v-3.4a4.84 4.84 0 01-1.2-.5z" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {generating && <div className="text-center text-gray-400 text-sm mt-4">Generating image...</div>}
                </div>
            </div>
        </div>
    );
}