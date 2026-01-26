// components/QRCodeModal.js
// Modal component for generating and downloading fundraiser QR codes
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

export default function QRCodeModal({ fundraiser, isOpen, onClose }) {
    const canvasRef = useRef(null);
    const [qrSize, setQrSize] = useState(512);
    const [includeText, setIncludeText] = useState(true);

    const fundraiserUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/fundraiser/${fundraiser?.id}`
        : '';

    useEffect(() => {
        if (isOpen && fundraiser && canvasRef.current) {
            generateQRCode();
        }
    }, [isOpen, fundraiser, qrSize, includeText]);

    const generateQRCode = async () => {
        if (!canvasRef.current) return;

        try {
            // Always generate at selected size for download, but display at 512
            const displaySize = 512;

            // Create temporary canvas at actual size
            const tempCanvas = document.createElement('canvas');
            await QRCode.toCanvas(tempCanvas, fundraiserUrl, {
                width: qrSize,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                },
                errorCorrectionLevel: 'H'
            });

            // Add text if enabled
            if (includeText) {
                const textHeight = Math.round(qrSize * 0.117); // Proportional to QR size
                const newCanvas = document.createElement('canvas');
                newCanvas.width = qrSize;
                newCanvas.height = qrSize + textHeight;
                const newCtx = newCanvas.getContext('2d');

                newCtx.fillStyle = '#FFFFFF';
                newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
                newCtx.drawImage(tempCanvas, 0, 0);

                const fontSize = Math.round(qrSize * 0.047);
                const smallFontSize = Math.round(qrSize * 0.035);

                newCtx.fillStyle = '#000000';
                newCtx.font = `bold ${fontSize}px Arial`;
                newCtx.textAlign = 'center';
                newCtx.fillText('Scan to Support', qrSize / 2, qrSize + (textHeight * 0.5));

                newCtx.font = `${smallFontSize}px Arial`;
                newCtx.fillText(fundraiser.title.substring(0, 40), qrSize / 2, qrSize + (textHeight * 0.87));

                tempCanvas.width = newCanvas.width;
                tempCanvas.height = newCanvas.height;
                tempCanvas.getContext('2d').drawImage(newCanvas, 0, 0);
            }

            // Draw scaled version to display canvas (always 512)
            canvasRef.current.width = displaySize;
            canvasRef.current.height = includeText ? displaySize + 60 : displaySize;
            const ctx = canvasRef.current.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height,
                0, 0, canvasRef.current.width, canvasRef.current.height);

            // Store actual size canvas for download
            canvasRef.current._fullSizeCanvas = tempCanvas;
        } catch (err) {
            console.error('Error generating QR code:', err);
        }
    };

    const downloadQRCode = () => {
        if (!canvasRef.current || !canvasRef.current._fullSizeCanvas) return;

        const link = document.createElement('a');
        link.download = `${fundraiser.title.replace(/[^a-z0-9]/gi, '_')}_QRCode.png`;
        link.href = canvasRef.current._fullSizeCanvas.toDataURL('image/png');
        link.click();
    };

    const copyToClipboard = async () => {
        if (!canvasRef.current || !canvasRef.current._fullSizeCanvas) return;

        try {
            const blob = await new Promise(resolve =>
                canvasRef.current._fullSizeCanvas.toBlob(resolve, 'image/png')
            );

            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);

            alert('✅ QR code copied to clipboard!');
        } catch (err) {
            console.error('Error copying to clipboard:', err);
            alert('❌ Failed to copy. Try downloading instead.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl max-w-lg w-full border border-gray-700 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-2xl font-bold text-white">📱 QR Code</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <p className="text-gray-400 text-sm">
                        Share this QR code for people to scan and support your fundraiser
                    </p>
                </div>

                {/* QR Code Display */}
                <div className="p-6">
                    <div className="bg-white rounded-lg p-4 flex items-center justify-center mb-4">
                        <canvas
                            ref={canvasRef}
                            width={512}
                            height={includeText ? 572 : 512}
                            style={{ maxWidth: '100%', height: 'auto' }}
                        />
                    </div>

                    {/* Options */}
                    <div className="space-y-4 mb-6">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="includeText"
                                checked={includeText}
                                onChange={(e) => setIncludeText(e.target.checked)}
                                className="w-4 h-4 bg-gray-700 border-gray-600 rounded"
                            />
                            <label htmlFor="includeText" className="text-gray-300 text-sm cursor-pointer">
                                Include "Scan to Support" text
                            </label>
                        </div>

                        <div>
                            <label className="block text-gray-300 text-sm mb-2">Download Size</label>
                            <select
                                value={qrSize}
                                onChange={(e) => setQrSize(Number(e.target.value))}
                                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value={256}>Small (256x256) - Social Media</option>
                                <option value={512}>Medium (512x512) - Recommended</option>
                                <option value={1024}>Large (1024x1024) - Posters</option>
                                <option value={2048}>Extra Large (2048x2048) - Banners</option>
                            </select>
                            <p className="text-gray-500 text-xs mt-1">Preview shows medium size. Download will be selected size.</p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        <button
                            onClick={downloadQRCode}
                            className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download QR Code
                        </button>

                        <button
                            onClick={copyToClipboard}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy to Clipboard
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition"
                        >
                            Close
                        </button>
                    </div>

                    {/* Tips */}
                    <div className="mt-6 bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <div className="text-2xl">💡</div>
                            <div className="flex-1">
                                <h3 className="text-blue-300 font-semibold mb-1 text-sm">Tips for Using QR Codes</h3>
                                <ul className="text-blue-200 text-xs space-y-1">
                                    <li>• Print on flyers, posters, or business cards</li>
                                    <li>• Share on social media stories and posts</li>
                                    <li>• Add to email signatures</li>
                                    <li>• Display at games or team events</li>
                                    <li>• Test scanning before printing large quantities</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}