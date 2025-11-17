
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Header from './components/Header';
import ProgressBar from './components/ProgressBar';
import InputField from './components/InputField';
import PreviewDisplay from './components/PreviewDisplay';
import EditImageModal from './components/EditImageModal';
import ImageReferenceManager from './components/ImageReferenceManager';
import { researchAndExtractDetails, generateImage, generateImageWithReferences, summarizeScript, generateVideoPromptForScene, generateThumbnailVariations, detectScriptLanguage, editImage } from './services/geminiService';

declare const pako: any;

export type ImageResult = {
    id: string;
    promptId?: string; // The ID of the prompt used to generate this image
    status: 'generating' | 'success' | 'error' | 'retrying' | 'cancelled';
    url?: string | null;
    error?: string | null;
    generatedBy?: string; // Name of the team member who generated it
};

export type Setting = {
    place: string;
    time: string;
    weather: string;
    season: string;
    mood: string;
    socialContext: string;
    theme: {
        centralIdea: string;
        thematicQuestion: string;
    };
};

export type Character = {
    id: string;
    name: string;
    isMain: boolean;
    goal: string;
    motivation: string;
    conflict: string;
    appearanceAndBehavior: string;
    backstory: string;
    characterArc: string;
    preview?: ImageResult;
    referenceImageUrl?: string | null;
};

export type TeamMember = {
    id: string;
    name: string;
};

export type SeriesPrompt = {
    id: string;
    value: string;
    variations: number;
};


const API_CALL_DELAY = 2500; // 2.5 seconds
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
const NUMBER_OF_THUMBNAILS = 4;

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const App: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
    
    // Team management state
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([{ id: uuidv4(), name: 'Thành viên 1' }]);
    const [activeUserId, setActiveUserId] = useState<string | null>(() => teamMembers[0]?.id || null);
    
    useEffect(() => {
        // Ensure there's always an active user if the list is not empty
        if (!activeUserId && teamMembers.length > 0) {
            setActiveUserId(teamMembers[0].id);
        }
    }, [teamMembers, activeUserId]);


    // Step 1: Style References
    const [referenceImages, setReferenceImages] = useState<ImageResult[]>([]);

    // Step 2: Script
    const [script, setScript] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [newMemberName, setNewMemberName] = useState('');
    const [scriptLanguage, setScriptLanguage] = useState('Vietnamese');


    // Step 3: Context
    const [settingDetails, setSettingDetails] = useState<Setting | null>(null);
    const [contextPrompt, setContextPrompt] = useState('');
    const [contextPreview, setContextPreview] = useState<ImageResult | null>(null);


    // Step 4: Characters
    const [characters, setCharacters] = useState<Character[]>([]);
    const [isGeneratingChars, setIsGeneratingChars] = useState(false);


    // Step 6: Series Generation
    const [seriesPrompts, setSeriesPrompts] = useState<SeriesPrompt[]>([]);
    const [generatedImages, setGeneratedImages] = useState<ImageResult[]>([]);
    const [selectedImageIds, setSelectedImageIds] = useState(new Set<string>());


    // Step 7: Video Prompts
    const [videoPrompts, setVideoPrompts] = useState<string[]>([]);
    const [isGeneratingVideoPrompts, setIsGeneratingVideoPrompts] = useState(false);

    // Step 8: Thumbnail
    const [thumbnailTopic, setThumbnailTopic] = useState('');
    const [thumbnailResults, setThumbnailResults] = useState<ImageResult[]>([]);
    const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);

    // Edit Modal State
    const [editingImage, setEditingImage] = useState<ImageResult | null>(null);
    
    // Stop generation state
    const isStoppingRef = useRef(false);

    // Refs for file uploads
    const contextFileInputRef = useRef<HTMLInputElement>(null);

    const activeUser = useMemo(() => teamMembers.find(m => m.id === activeUserId), [teamMembers, activeUserId]);


    const handleNextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 8));
    const handlePrevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));
    const goToStep = (step: number) => setCurrentStep(step);

    const handleStopGeneration = useCallback(() => {
        isStoppingRef.current = true;
    }, []);

    const handleUploadReferenceImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const newImages: ImageResult[] = [];
        // FIX: Iterate directly over the FileList as it is iterable and provides correct typing for 'file'.
        // This resolves errors where 'file' was being inferred as 'unknown'.
        for (const file of files) {
            try {
                const base64Url = await fileToBase64(file);
                newImages.push({
                    id: uuidv4(),
                    status: 'success',
                    url: base64Url,
                    generatedBy: `Tải lên bởi ${activeUser?.name}`
                });
            } catch (error) {
                setError(`Lỗi khi tải ảnh tham khảo: ${file.name}`);
                console.error(error);
            }
        }
        setReferenceImages(prev => [...prev, ...newImages]);
        event.target.value = ''; // Clear input
    };

    const handleDeleteReferenceImage = (id: string) => {
        setReferenceImages(prev => prev.filter(img => img.id !== id));
    };

    const handleAnalyzeScript = async () => {
        setIsAnalyzing(true);
        setError(null);
        isStoppingRef.current = false;
        try {
            const lang = await detectScriptLanguage(script);
            setScriptLanguage(lang);

            const { setting, characters: analyzedChars } = await researchAndExtractDetails(script, lang);
            setSettingDetails(setting);
            const generatedContextPrompt = `Bối cảnh chính: ${setting.place} vào ${setting.time}. Thời tiết: ${setting.weather} (${setting.season}). Bầu không khí ${setting.mood}.`;
            setContextPrompt(generatedContextPrompt);

            setCharacters(analyzedChars.map(char => ({ ...char, id: uuidv4(), preview: undefined, referenceImageUrl: null })));
            setCurrentStep(3);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred during analysis.';
            setError(message);
            setSettingDetails(null); // Reset data on failure
            setCharacters([]);       // Reset data on failure
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleUploadContextImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const base64Url = await fileToBase64(file);
            const id = 'context-preview';
            setContextPreview({
                id,
                status: 'success',
                url: base64Url,
                generatedBy: `Tải lên bởi ${activeUser?.name}`
            });
        } catch (error) {
            setError("Lỗi khi tải ảnh lên.");
            console.error(error);
        }
        // Clear the input value to allow re-uploading the same file
        event.target.value = '';
    };

    const handleGenerateContext = async () => {
        const id = 'context-preview';
        setContextPreview({ id, status: 'generating' });
        try {
            const url = await generateImage(contextPrompt, settingDetails, referenceImages, scriptLanguage);
            setContextPreview({ id, status: 'success', url, generatedBy: activeUser?.name });
        } catch (err) {
            setContextPreview({ id, status: 'error', error: err instanceof Error ? err.message : 'Lỗi không xác định' });
        }
    };
    
    const handleCharacterChange = (id: string, field: keyof Character, value: string) => {
        setCharacters(chars => chars.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const handleAddNewCharacter = () => {
        const newChar: Character = {
            id: uuidv4(),
            name: 'Nhân vật mới',
            isMain: false,
            goal: '',
            motivation: '',
            conflict: '',
            appearanceAndBehavior: '',
            backstory: '',
            characterArc: '',
            preview: undefined,
            referenceImageUrl: null
        };
        setCharacters(prev => [...prev, newChar]);
    };

    const handleRemoveCharacter = (id: string) => {
        setCharacters(chars => chars.filter(c => c.id !== id));
    };
    
    const handleUploadCharacterImage = async (event: React.ChangeEvent<HTMLInputElement>, characterId: string) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const base64Url = await fileToBase64(file);
            setCharacters(chars => chars.map(c => {
                if (c.id === characterId) {
                    return {
                        ...c,
                        preview: {
                            id: c.id,
                            status: 'success',
                            url: base64Url,
                            generatedBy: `Tải lên bởi ${activeUser?.name}`
                        },
                        referenceImageUrl: base64Url, // Auto-select as reference
                    };
                }
                return c;
            }));
        } catch (error) {
            setError(`Lỗi khi tải ảnh cho nhân vật.`);
            console.error(error);
        }
        event.target.value = '';
    };

    const handleGenerateSingleCharacter = useCallback(async (id: string) => {
        const character = characters.find(c => c.id === id);
        if (!character) return;

        setCharacters(chars => chars.map(c => c.id === id ? { ...c, preview: { id, status: 'generating' } } : c));

        try {
            const prompt = `${character.appearanceAndBehavior}. Bối cảnh: ${contextPrompt}`;
            const url = await generateImage(prompt, settingDetails, referenceImages, scriptLanguage);
            setCharacters(chars => chars.map(c => c.id === id ? { ...c, preview: { id, status: 'success', url, generatedBy: activeUser?.name } } : c));
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Lỗi không xác định';
            setCharacters(chars => chars.map(c => c.id === id ? { ...c, preview: { id, status: 'error', error: errorMsg } } : c));
            throw err; // Re-throw to be caught by the sequential generator
        }
    }, [characters, contextPrompt, activeUser, settingDetails, referenceImages, scriptLanguage]);

    const handleGenerateAllCharacterPreviews = async () => {
        setIsGeneratingChars(true);
        setError(null);
        isStoppingRef.current = false; // Reset on start

        const charactersToGenerate = characters.filter(c => !c.preview || c.preview.status !== 'success');

        for (let i = 0; i < charactersToGenerate.length; i++) {
             if (isStoppingRef.current) {
                const remainingCharIds = new Set(charactersToGenerate.slice(i).map(c => c.id));
                setCharacters(chars =>
                    chars.map(c => {
                        if (remainingCharIds.has(c.id) && (!c.preview || c.preview.status === 'generating')) {
                            return { ...c, preview: { id: c.id, status: 'cancelled', error: 'Người dùng đã dừng' } };
                        }
                        return c;
                    })
                );
                break;
            }

            const char = charactersToGenerate[i];
            try {
                await handleGenerateSingleCharacter(char.id);
            } catch (err) {
                 const errorMsg = err instanceof Error ? err.message : 'Lỗi không xác định';
                 if (errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('limit')) {
                    setError('Hạn ngạch API của bạn đã đạt giới hạn. Hãy lưu dự án, gửi cho một thành viên khác trong nhóm để tải lên và tiếp tục.');
                    setIsQuotaExceeded(true);
                    // Cancel remaining characters
                    setCharacters(chars => {
                        const remainingCharIds = new Set(charactersToGenerate.slice(i + 1).map(c => c.id));
                         return chars.map(c => {
                            if (remainingCharIds.has(c.id) && (!c.preview || c.preview.status === 'generating')) {
                                return { ...c, preview: { id: c.id, status: 'cancelled', error: 'Bị hủy do giới hạn API' } };
                            }
                            return c;
                        });
                    });
                    break; // Exit the loop
                }
            }
            // Add delay between requests to avoid hitting rate limits, but not after the last one
            if (i < charactersToGenerate.length - 1) {
                await delay(API_CALL_DELAY);
            }
        }
        setIsGeneratingChars(false);
        isStoppingRef.current = false;
    };

    const handleProceedToSeries = () => {
        const prompts = script.split('\n').filter(Boolean).map(value => ({ id: uuidv4(), value, variations: 1 }));
        setSeriesPrompts(prompts);
        handleNextStep();
    };

    type GenerationTask = {
        promptId: string;
        value: string;
        imageId: string;
        variationText: string;
    };
    
    const runGenerationTasks = useCallback(async (tasks: GenerationTask[]) => {
        setIsLoading(true);
        setError(null);
        isStoppingRef.current = false;

        setGeneratedImages(currentImgs => {
            let newImgs = [...currentImgs];
            tasks.forEach(task => {
                const existingIndex = newImgs.findIndex(img => img.id === task.imageId);
                const placeholder: ImageResult = { id: task.imageId, promptId: task.promptId, status: 'generating' };
                if (existingIndex > -1) {
                    newImgs[existingIndex] = placeholder;
                } else {
                    newImgs.push(placeholder);
                }
            });
            return newImgs;
        });

        for (const task of tasks) {
            if (isStoppingRef.current) {
                setGeneratedImages(imgs => imgs.map(img => (tasks.find(t => t.imageId === img.id) && img.status === 'generating') ? { ...img, status: 'cancelled', error: 'Người dùng đã dừng' } : img));
                break;
            }

            try {
                const fullPrompt = `${task.value} ${task.variationText}. Bối cảnh: ${contextPrompt}`;
                const url = await generateImageWithReferences(fullPrompt, characters, settingDetails, referenceImages, scriptLanguage);
                setGeneratedImages(imgs => imgs.map(img => img.id === task.imageId ? { ...img, status: 'success', url, generatedBy: activeUser?.name } : img));
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Lỗi không xác định';
                setGeneratedImages(imgs => imgs.map(img => img.id === task.imageId ? { ...img, status: 'error', error: errorMsg } : img));

                if (errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('limit')) {
                    setError('Hạn ngạch API của bạn đã đạt giới hạn. Hãy lưu dự án, gửi cho một thành viên khác trong nhóm để tải lên và tiếp tục.');
                    setIsQuotaExceeded(true);
                    const remainingTasks = tasks.slice(tasks.indexOf(task) + 1);
                    setGeneratedImages(imgs => {
                        const newImgs = [...imgs];
                        remainingTasks.forEach(remTask => {
                            const imgIndex = newImgs.findIndex(img => img.id === remTask.imageId);
                            if (imgIndex !== -1 && newImgs[imgIndex].status === 'generating') {
                                newImgs[imgIndex] = { ...newImgs[imgIndex], status: 'cancelled', error: 'Bị hủy do giới hạn API' };
                            }
                        });
                        return newImgs;
                    });
                    break;
                }
            }
            if (tasks.indexOf(task) < tasks.length - 1) {
                await delay(API_CALL_DELAY);
            }
        }
        setIsLoading(false);
        isStoppingRef.current = false;
    }, [characters, contextPrompt, activeUser, settingDetails, referenceImages, scriptLanguage]);


    const handleGenerateSeries = useCallback(async () => {
        const tasks: GenerationTask[] = [];
        seriesPrompts.forEach(p => {
            for (let i = 0; i < p.variations; i++) {
                const imageId = `series-${p.id}-var-${i}`;
                const existingImage = generatedImages.find(img => img.id === imageId && img.status === 'success');
                if (!existingImage) {
                    tasks.push({
                        promptId: p.id,
                        value: p.value,
                        imageId: imageId,
                        variationText: p.variations > 1 ? `(Shot ${i + 1}/${p.variations}, different cinematic angle)` : ''
                    });
                }
            }
        });

        if (tasks.length > 0) {
            await runGenerationTasks(tasks);
        }
    }, [seriesPrompts, generatedImages, runGenerationTasks]);
    
    const handleGenerateVariationsForPrompt = useCallback(async (promptId: string) => {
        const promptData = seriesPrompts.find(p => p.id === promptId);
        if (!promptData) return;

        const tasks: GenerationTask[] = [];
        for (let i = 0; i < promptData.variations; i++) {
            tasks.push({
                promptId: promptData.id,
                value: promptData.value,
                imageId: `series-${promptData.id}-var-${i}`,
                variationText: promptData.variations > 1 ? `(Shot ${i + 1}/${promptData.variations}, different cinematic angle)` : ''
            });
        }
        
        if (tasks.length > 0) {
            await runGenerationTasks(tasks);
        }
    }, [seriesPrompts, runGenerationTasks]);

    
    const handleRegenerateSingleSeriesImage = async (imageId: string) => {
        const imageToRegen = generatedImages.find(img => img.id === imageId);
        if (!imageToRegen || !imageToRegen.promptId) {
            setError(`Không tìm thấy thông tin prompt cho ảnh.`);
            return;
        }

        const promptData = seriesPrompts.find(p => p.id === imageToRegen.promptId);
        if (!promptData) {
            setError(`Không tìm thấy prompt gốc.`);
            return;
        }

        const parts = imageId.split('-var-');
        const variationIndex = parts.length > 1 ? parseInt(parts[1], 10) : 0;
        
        const task: GenerationTask = {
            promptId: promptData.id,
            value: promptData.value,
            imageId: imageId,
            variationText: promptData.variations > 1 ? `(Shot ${variationIndex + 1}/${promptData.variations}, different cinematic angle)` : ''
        };

        await runGenerationTasks([task]);
    };

    const handleRetryFailedSeriesImages = async () => {
        setIsQuotaExceeded(false);
        setError(null);
    
        const tasks: GenerationTask[] = [];
        const imagesToRetry = generatedImages.filter(img => (img.status === 'error' || img.status === 'cancelled') && img.promptId);

        imagesToRetry.forEach(image => {
            const promptData = seriesPrompts.find(p => p.id === image.promptId);
            if(promptData) {
                const parts = image.id.split('-var-');
                const variationIndex = parts.length > 1 ? parseInt(parts[1], 10) : 0;
                tasks.push({
                    promptId: promptData.id,
                    value: promptData.value,
                    imageId: image.id,
                    variationText: promptData.variations > 1 ? `(Shot ${variationIndex + 1}/${promptData.variations}, different cinematic angle)` : ''
                });
            }
        });
        
        if (tasks.length > 0) {
           await runGenerationTasks(tasks);
        }
    };

    const handleToggleImageSelection = (id: string) => {
        setSelectedImageIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleGenerateVideoPrompts = async () => {
        setIsGeneratingVideoPrompts(true);
        setError(null);
        setVideoPrompts([]); // Clear previous results
        isStoppingRef.current = false;

        try {
            // 1. Get characters and a script summary for context
            const mainCharacters = characters.filter(c => c.isMain);
            const scriptSummary = await summarizeScript(script, scriptLanguage);

            // 2. Filter for scenes that have a successfully generated image
            const scenesToProcess = seriesPrompts
                .map(p => ({
                    prompt: p,
                    // Pick the first successful image for this prompt as the keyframe
                    image: generatedImages.find(img => img.promptId === p.id && img.status === 'success')
                }))
                .filter(s => s.image);

            if (scenesToProcess.length === 0) {
                setError("Không có ảnh thành công nào để tạo prompt video.");
                setIsGeneratingVideoPrompts(false);
                return;
            }

            // 3. Process each scene sequentially
            const allVideoPrompts: string[] = [];
            for (const scene of scenesToProcess) {
                if (isStoppingRef.current) {
                    console.log("Video prompt generation stopped by user.");
                    break;
                }

                const videoPrompt = await generateVideoPromptForScene(
                    scene.prompt.value,
                    scene.image!.url!,
                    mainCharacters,
                    scriptSummary,
                    scriptLanguage
                );

                allVideoPrompts.push(videoPrompt);
                setVideoPrompts([...allVideoPrompts]); // Update UI progressively

                // Small delay to avoid hitting potential rate limits, but not after the last one
                if (scenesToProcess.indexOf(scene) < scenesToProcess.length - 1) {
                    await delay(API_CALL_DELAY);
                }
            }

        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Lỗi không xác định khi tạo video prompts.';
            setError(errorMsg);
            if (errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('limit')) {
                setIsQuotaExceeded(true);
            }
        } finally {
            setIsGeneratingVideoPrompts(false);
            isStoppingRef.current = false;
        }
    };
    
    const handleDownloadVideoPrompts = () => {
        const content = videoPrompts.join('\n');
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'video-prompts.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleGenerateThumbnail = async () => {
        setIsGeneratingThumbnail(true);
        setError(null);
        const placeholderResults: ImageResult[] = Array.from({ length: NUMBER_OF_THUMBNAILS }, (_, i) => ({
            id: `thumbnail-${uuidv4()}`,
            status: 'generating'
        }));
        setThumbnailResults(placeholderResults);
    
        try {
            const urls = await generateThumbnailVariations(thumbnailTopic, script, characters, NUMBER_OF_THUMBNAILS, settingDetails, referenceImages, scriptLanguage);
            
            const finalResults = placeholderResults.map((result, i) => {
                if (urls[i]) {
                    return { ...result, status: 'success' as const, url: urls[i], generatedBy: activeUser?.name };
                }
                return { ...result, status: 'error' as const, error: 'Không nhận được ảnh từ API.' };
            });
            setThumbnailResults(finalResults);
    
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Lỗi không xác định';
            const finalErrorResults = placeholderResults.map(result => ({
                ...result,
                status: 'error' as const,
                error: errorMsg
            }));
            setThumbnailResults(finalErrorResults);
             if (errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('limit')) {
                setError('Hạn ngạch API của bạn đã đạt giới hạn.');
                setIsQuotaExceeded(true);
            }
        } finally {
            setIsGeneratingThumbnail(false);
        }
    };
    
    const handleApplyEdit = (editedImage: ImageResult) => {
        const updatedImage = { ...editedImage, generatedBy: `Sửa bởi ${activeUser?.name}` };
        const originalUrl = editingImage?.url; // Get the URL before the edit

        setGeneratedImages(imgs => imgs.map(img => img.id === updatedImage.id ? updatedImage : img));

        // Updated logic to also update referenceImageUrl if the edited image was a reference
        setCharacters(chars => chars.map(c => {
            let updatedChar = { ...c };
            // Update the preview if this character's preview was the image edited
            if (c.preview?.id === updatedImage.id) {
                updatedChar.preview = updatedImage;
            }
            // If the edited image was this character's reference, update the reference URL
            if (originalUrl && c.referenceImageUrl === originalUrl) {
                updatedChar.referenceImageUrl = updatedImage.url;
            }
            return updatedChar;
        }));

        if (contextPreview?.id === updatedImage.id) setContextPreview(updatedImage);
        setThumbnailResults(thumbs => thumbs.map(thumb => thumb.id === updatedImage.id ? updatedImage : thumb));
        setEditingImage(null);
    };

    const handleSaveProject = () => {
        const projectState = {
            metadata: {
                savedBy: activeUser?.name || 'Không rõ',
                savedAt: new Date().toISOString(),
            },
            appState: {
                currentStep, script, settingDetails, contextPrompt, contextPreview,
                characters, seriesPrompts, generatedImages, videoPrompts, thumbnailTopic,
                thumbnailResults, selectedImageIds: Array.from(selectedImageIds),
                teamMembers, activeUserId, referenceImages, scriptLanguage
            }
        };
        const jsonString = JSON.stringify(projectState, null, 2);
        const compressedData = pako.gzip(jsonString);
    
        const blob = new Blob([compressedData], { type: 'application/octet-stream' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `tm-media-project-${timestamp}.tmproj`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleLoadProject = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const arrayBuffer = e.target?.result as ArrayBuffer;
                if (!arrayBuffer) throw new Error("File could not be read.");
    
                let jsonText: string;
                try {
                    jsonText = pako.ungzip(new Uint8Array(arrayBuffer), { to: 'string' });
                } catch (unzipError) {
                    jsonText = new TextDecoder().decode(arrayBuffer);
                }

                const loadedProject = JSON.parse(jsonText);
                const loadedState = loadedProject.appState || loadedProject;

                if (!loadedState.script && !loadedState.currentStep) {
                    throw new Error("Invalid project file format.");
                }

                setCurrentStep(loadedState.currentStep || 1);
                setScript(loadedState.script || '');
                setSettingDetails(loadedState.settingDetails || null);
                setContextPrompt(loadedState.contextPrompt || '');
                setContextPreview(loadedState.contextPreview || null);
                setCharacters(loadedState.characters || []);
                setSeriesPrompts(loadedState.seriesPrompts || []);
                setGeneratedImages(loadedState.generatedImages || []);
                setVideoPrompts(loadedState.videoPrompts || []);
                setThumbnailTopic(loadedState.thumbnailTopic || '');
                setThumbnailResults(loadedState.thumbnailResults || []);
                setSelectedImageIds(new Set(loadedState.selectedImageIds || []));
                setTeamMembers(loadedState.teamMembers || [{ id: uuidv4(), name: 'Thành viên 1' }]);
                setActiveUserId(loadedState.activeUserId || (loadedState.teamMembers?.[0]?.id || null));
                setReferenceImages(loadedState.referenceImages || []);
                setScriptLanguage(loadedState.scriptLanguage || 'Vietnamese');

                 if(loadedProject.metadata?.savedBy) {
                    alert(`Dự án được tải lên, được lưu lần cuối bởi ${loadedProject.metadata.savedBy} lúc ${new Date(loadedProject.metadata.savedAt).toLocaleString()}`);
                 }
                setError(null);
                setIsQuotaExceeded(false);
            } catch (err) {
                 const message = err instanceof Error ? err.message : 'An unknown error occurred.';
                 setError(`Không thể tải dự án: ${message}`);
            }
        };
        reader.onerror = () => setError("Lỗi khi đọc file dự án.");
        reader.readAsArrayBuffer(file);
        event.target.value = '';
    };

    const handleAddMember = () => {
        if (newMemberName.trim()) {
            const newMember = { id: uuidv4(), name: newMemberName.trim() };
            setTeamMembers([...teamMembers, newMember]);
            setNewMemberName('');
            if (!activeUserId) {
                setActiveUserId(newMember.id);
            }
        }
    };

    const handleRemoveMember = (id: string) => {
        setTeamMembers(teamMembers.filter(m => m.id !== id));
        if (activeUserId === id) {
            setActiveUserId(teamMembers[0]?.id || null);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-indigo-400">Bước 1: Học Phong cách (Tùy chọn)</h2>
                        <ImageReferenceManager
                            images={referenceImages}
                            onUpload={handleUploadReferenceImages}
                            onDelete={handleDeleteReferenceImage}
                        />
                        <div className="flex gap-2">
                            <button onClick={handleNextStep} className="w-full bg-green-600 hover:bg-green-500 rounded p-2">
                                Tiếp tục
                            </button>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-6">
                        <div>
                          <h2 className="text-xl font-bold text-indigo-400">Bước 2: Kịch bản & Đội nhóm</h2>
                        </div>
                        
                        <div className="space-y-4 bg-gray-700/30 p-4 rounded-lg">
                            <h3 className="font-semibold text-lg text-teal-300">Không gian làm việc nhóm</h3>
                            <div className="space-y-2">
                                <label htmlFor="activeUser" className="block text-sm font-medium text-gray-300">Người thực hiện hiện tại:</label>
                                <select 
                                    id="activeUser"
                                    value={activeUserId || ''}
                                    onChange={(e) => setActiveUserId(e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                >
                                    {teamMembers.map(member => (
                                        <option key={member.id} value={member.id}>{member.name}</option>
                                    ))}
                                </select>
                            </div>
                             <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-300">Thành viên:</label>
                                <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                                    {teamMembers.map(member => (
                                        <div key={member.id} className="flex items-center justify-between bg-gray-800/50 p-2 rounded">
                                            <span className="text-sm">{member.name}</span>
                                            <button onClick={() => handleRemoveMember(member.id)} className="text-red-400 hover:text-red-300 text-xs" disabled={teamMembers.length <= 1}>
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                             <div className="flex gap-2">
                                <input 
                                    type="text"
                                    value={newMemberName}
                                    onChange={(e) => setNewMemberName(e.target.value)}
                                    placeholder="Tên thành viên mới..."
                                    className="flex-grow bg-gray-700 border border-gray-600 rounded-lg p-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                                />
                                <button onClick={handleAddMember} className="bg-blue-600 hover:bg-blue-500 rounded p-2 text-sm">Thêm</button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <InputField label="Nội dung kịch bản" name="script" value={script} onChange={(e) => setScript(e.target.value)} placeholder="Dán kịch bản vào đây... (có thể bỏ trống)" isTextArea rows={10} />
                            <div className="flex gap-2">
                                <button onClick={handleAnalyzeScript} disabled={isAnalyzing || !script || isQuotaExceeded} className="w-full bg-indigo-600 hover:bg-indigo-500 rounded p-2 disabled:bg-indigo-800 disabled:cursor-not-allowed">
                                    {isAnalyzing ? 'Đang phân tích...' : 'Phân tích Kịch bản'}
                                </button>
                                <button onClick={handleNextStep} className="w-full bg-gray-600 hover:bg-gray-500 rounded p-2">
                                    Bỏ qua & Tiếp tục
                                </button>
                            </div>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-indigo-400">Bước 3: Bối cảnh</h2>
                        {settingDetails && (
                            <div className="space-y-3 text-sm bg-gray-700/50 p-3 rounded-lg">
                                <p><strong><i className="fas fa-map-marker-alt mr-2 text-red-400"></i>Địa điểm:</strong> {settingDetails.place}</p>
                                <p><strong><i className="fas fa-clock mr-2 text-blue-400"></i>Thời gian:</strong> {settingDetails.time}</p>
                                <p><strong><i className="fas fa-cloud-sun-rain mr-2 text-teal-400"></i>Thời tiết:</strong> {settingDetails.weather}</p>
                                <p><strong><i className="fas fa-calendar-alt mr-2 text-orange-400"></i>Mùa:</strong> {settingDetails.season}</p>
                                <p><strong><i className="fas fa-wind mr-2 text-cyan-400"></i>Bầu không khí:</strong> {settingDetails.mood}</p>
                                <p><strong><i className="fas fa-users mr-2 text-yellow-400"></i>Bối cảnh XH:</strong> {settingDetails.socialContext}</p>
                            </div>
                        )}
                        <InputField label="Prompt tóm tắt bối cảnh (có thể sửa)" name="contextPrompt" value={contextPrompt} onChange={(e) => setContextPrompt(e.target.value)} isTextArea />
                        <p className="text-xs text-center text-gray-400 bg-gray-700/30 p-2 rounded-md">
                          <i className="fas fa-info-circle mr-1"></i>
                          Tất cả hình ảnh sẽ được tạo ở tỷ lệ 16:9 (widescreen).
                        </p>
                        <div className="flex gap-2">
                            <button onClick={handleGenerateContext} disabled={isLoading || !contextPrompt || isQuotaExceeded} className="w-full bg-indigo-600 hover:bg-indigo-500 rounded p-2 disabled:bg-indigo-800">
                                <i className="fas fa-magic-wand-sparkles mr-2"></i>Tạo ảnh
                            </button>
                            <button onClick={() => contextFileInputRef.current?.click()} className="w-full bg-teal-600 hover:bg-teal-500 rounded p-2">
                                <i className="fas fa-upload mr-2"></i>Tải lên
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handlePrevStep} className="w-full bg-gray-600 hover:bg-gray-500 rounded p-2">Quay lại</button>
                            <button onClick={handleNextStep} disabled={!contextPreview || contextPreview.status !== 'success'} className="w-full bg-green-600 hover:bg-green-500 rounded p-2 disabled:bg-green-800">Tiếp tục</button>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-4 flex flex-col h-full">
                        <h2 className="text-xl font-bold text-indigo-400">Bước 4: Hồ sơ Nhân vật</h2>
                        <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                            {characters.map((char) => (
                                <details key={char.id} className="bg-gray-700 p-3 rounded-lg space-y-2 group" open>
                                    <summary className="font-bold text-lg cursor-pointer flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <span>{char.name} {char.isMain && <i className="fas fa-star text-yellow-400 ml-2" title="Nhân vật chính"></i>}</span>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (window.confirm(`Bạn có chắc chắn muốn xóa nhân vật "${char.name}" không?`)) {
                                                        handleRemoveCharacter(char.id);
                                                    }
                                                }}
                                                className="text-red-500 hover:text-red-400 text-xs p-1 rounded-full hover:bg-gray-600/50 transition-colors disabled:text-gray-500 disabled:cursor-not-allowed"
                                                title={`Xóa nhân vật ${char.name}`}
                                                disabled={characters.length <= 1}
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </div>
                                        <i className="fas fa-chevron-down group-open:rotate-180 transition-transform"></i>
                                    </summary>
                                    <div className="pt-2 space-y-2">
                                        <InputField label="Ngoại hình & Hành vi" name={`appearance_${char.id}`} value={char.appearanceAndBehavior} onChange={(e) => handleCharacterChange(char.id, 'appearanceAndBehavior', e.target.value)} isTextArea />
                                        <InputField label="Mục tiêu" name={`goal_${char.id}`} value={char.goal} onChange={(e) => handleCharacterChange(char.id, 'goal', e.target.value)} />
                                        <InputField label="Động lực" name={`motivation_${char.id}`} value={char.motivation} onChange={(e) => handleCharacterChange(char.id, 'motivation', e.target.value)} isTextArea />
                                        <div className="flex items-center gap-2 pt-2">
                                            <button
                                                onClick={() => handleGenerateSingleCharacter(char.id)}
                                                className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-3 rounded-lg text-sm transition-colors disabled:bg-teal-800 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                disabled={isGeneratingChars || isQuotaExceeded}
                                            >
                                                <i className="fas fa-magic-wand-sparkles"></i>Tạo ảnh
                                            </button>
                                            <label htmlFor={`char-upload-${char.id}`} className="flex-1 text-center bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-lg text-sm transition-colors cursor-pointer flex items-center justify-center gap-2">
                                                <i className="fas fa-upload"></i>Tải lên
                                            </label>
                                            <input
                                                type="file"
                                                id={`char-upload-${char.id}`}
                                                onChange={(e) => handleUploadCharacterImage(e, char.id)}
                                                accept="image/*"
                                                className="hidden"
                                            />
                                        </div>
                                    </div>
                                </details>
                            ))}
                        </div>
                        <div className="mt-auto space-y-2">
                            <button onClick={handleAddNewCharacter} className="w-full bg-blue-600 hover:bg-blue-500 rounded p-2 text-sm flex items-center justify-center gap-2">
                                <i className="fas fa-plus"></i>Thêm Nhân vật mới
                            </button>
                            <button onClick={handleGenerateAllCharacterPreviews} disabled={isGeneratingChars || isQuotaExceeded} className="w-full bg-teal-600 hover:bg-teal-500 rounded p-3 text-lg disabled:bg-teal-800 disabled:cursor-not-allowed">
                                {isGeneratingChars ? 'Đang tạo...' : 'Tạo tất cả ảnh xem trước'}
                            </button>
                            <div className="flex gap-2">
                                <button onClick={handlePrevStep} className="w-full bg-gray-600 hover:bg-gray-500 rounded p-2">Quay lại</button>
                                <button onClick={handleNextStep} disabled={characters.some(c => !c.preview || c.preview.status !== 'success')} className="w-full bg-green-600 hover:bg-green-500 rounded p-2 disabled:bg-green-800">Tiếp tục</button>
                            </div>
                        </div>
                    </div>
                );
            case 5:
                return (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-indigo-400">Bước 5: Chủ đề (Theme)</h2>
                        {settingDetails?.theme && (
                            <div className="space-y-3 text-sm bg-gray-700/50 p-3 rounded-lg">
                                <p><strong><i className="fas fa-lightbulb mr-2 text-purple-400"></i>Ý tưởng trung tâm:</strong> {settingDetails.theme.centralIdea}</p>
                                <p><strong><i className="fas fa-question-circle mr-2 text-purple-400"></i>Câu hỏi triết lý:</strong> {settingDetails.theme.thematicQuestion}</p>
                            </div>
                        )}
                        <p className="text-sm text-gray-400">Xem lại chủ đề đã được phân tích. Chủ đề này sẽ định hướng tông màu và cảm xúc cho series ảnh.</p>
                        <div className="flex gap-2">
                            <button onClick={handlePrevStep} className="w-full bg-gray-600 hover:bg-gray-500 rounded p-2">Quay lại</button>
                            <button onClick={handleProceedToSeries} className="w-full bg-green-600 hover:bg-green-500 rounded p-2">Tiếp tục tạo Series</button>
                        </div>
                    </div>
                );
            case 6:
                return (
                    <div className="space-y-4 flex flex-col h-full">
                        <h2 className="text-xl font-bold text-indigo-400">Bước 6: Tạo Series Ảnh</h2>
                        <p className="text-sm text-gray-400">Tinh chỉnh prompt và chọn số lượng ảnh (biến thể) cho mỗi cảnh.</p>
                        <div className="flex-grow overflow-y-auto pr-2 space-y-2">
                          {seriesPrompts.map((p, index) => {
                             const associatedImages = generatedImages.filter(img => img.promptId === p.id);
                             const isGeneratingForThis = associatedImages.some(img => ['generating', 'retrying'].includes(img.status));
                             const hasSuccessForThis = associatedImages.some(img => img.status === 'success');

                            return (
                                <div key={p.id} className="flex items-center gap-2 bg-gray-700/30 p-2 rounded-lg">
                                    <span className="text-gray-400 font-mono text-sm w-6 text-center">{index + 1}.</span>
                                    <div className="flex-grow">
                                        <InputField label="" name={`prompt_${p.id}`} value={p.value} onChange={e => setSeriesPrompts(prompts => prompts.map(prompt => prompt.id === p.id ? { ...prompt, value: e.target.value } : prompt))} placeholder="Mô tả cảnh..." />
                                    </div>
                                     <div className="flex-shrink-0">
                                        <label htmlFor={`variations_${p.id}`} className="text-xs text-gray-400 block text-center mb-1">Số ảnh</label>
                                        <input
                                            id={`variations_${p.id}`}
                                            type="number"
                                            min="1"
                                            value={p.variations}
                                            onChange={e => {
                                                const newVariations = Math.max(1, parseInt(e.target.value, 10) || 1);
                                                setSeriesPrompts(prompts =>
                                                    prompts.map(prompt =>
                                                        prompt.id === p.id ? { ...prompt, variations: newVariations } : prompt
                                                    )
                                                );
                                            }}
                                            className="w-16 bg-gray-700 border border-gray-600 rounded-lg p-2 text-center text-gray-200"
                                            title="Số lượng ảnh cần tạo cho prompt này"
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleGenerateVariationsForPrompt(p.id)}
                                        disabled={isLoading || isGeneratingForThis || isQuotaExceeded}
                                        className="p-2 w-10 h-10 flex-shrink-0 flex items-center justify-center bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg transition-colors disabled:bg-teal-800 disabled:cursor-not-allowed"
                                        title={hasSuccessForThis ? "Tạo lại các ảnh cho prompt này" : "Tạo ảnh cho prompt này"}
                                    >
                                        {isGeneratingForThis
                                            ? <i className="fas fa-spinner fa-spin"></i>
                                            : <i className={`fas ${hasSuccessForThis ? 'fa-sync-alt' : 'fa-play'}`}></i>
                                        }
                                    </button>
                                </div>
                            );
                          })}
                        </div>
                        <button onClick={handleGenerateSeries} disabled={isLoading || isQuotaExceeded} className="w-full bg-indigo-600 hover:bg-indigo-500 rounded p-3 text-lg disabled:bg-indigo-800 disabled:cursor-not-allowed">
                            {isLoading ? 'Đang tạo...' : 'Tạo tất cả các ảnh còn thiếu'}
                        </button>
                        <div className="flex gap-2">
                            <button onClick={handlePrevStep} className="w-full bg-gray-600 hover:bg-gray-500 rounded p-2">Quay lại</button>
                            <button onClick={handleNextStep} disabled={generatedImages.length === 0 || generatedImages.some(p => p.status !== 'success')} className="w-full bg-green-600 hover:bg-green-500 rounded p-2 disabled:bg-green-800">Tiếp tục</button>
                        </div>
                    </div>
                );
            case 7:
                 return (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-indigo-400">Bước 7: Tạo Prompt Video</h2>
                        <button onClick={handleGenerateVideoPrompts} disabled={isGeneratingVideoPrompts || isQuotaExceeded} className="w-full bg-orange-600 hover:bg-orange-500 rounded p-2 disabled:bg-orange-800 disabled:cursor-not-allowed">
                            {isGeneratingVideoPrompts ? 'Đang tạo...' : 'Tạo Prompt Video'}
                        </button>
                        <div className="flex gap-2">
                            <button onClick={handlePrevStep} className="w-full bg-gray-600 hover:bg-gray-500 rounded p-2">Quay lại</button>
                            <button onClick={handleNextStep} disabled={videoPrompts.length === 0} className="w-full bg-green-600 hover:bg-green-500 rounded p-2 disabled:bg-green-800">Tạo Thumbnail (Bước 8)</button>
                        </div>
                    </div>
                );
            case 8:
                return (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-indigo-400">Bước 8: Tạo Thumbnail A/B Testing</h2>
                        <InputField label="Chủ đề / Tiêu đề cho Thumbnail" name="thumbnailTopic" value={thumbnailTopic} onChange={(e) => setThumbnailTopic(e.target.value)} placeholder="VD: Thảm họa ở Louisville" />
                        <button onClick={handleGenerateThumbnail} disabled={isGeneratingThumbnail || !thumbnailTopic || isQuotaExceeded} className="w-full bg-purple-600 hover:bg-purple-500 rounded p-2 disabled:bg-purple-800 disabled:cursor-not-allowed">
                            {isGeneratingThumbnail ? 'Đang tạo...' : `Tạo ${NUMBER_OF_THUMBNAILS} phiên bản Thumbnail`}
                        </button>
                        <div className="flex gap-2">
                            <button onClick={handlePrevStep} className="w-full bg-gray-600 hover:bg-gray-500 rounded p-2">Quay lại</button>
                        </div>
                    </div>
                );
            default: return null;
        }
    };
    
    const characterPreviews = useMemo(() => characters.map(c => c.preview).filter(Boolean) as ImageResult[], [characters]);

    const activeStepForPreview = useMemo(() => {
        if (thumbnailResults.length > 0 || isGeneratingThumbnail) return 8;
        if (videoPrompts.length > 0 || isGeneratingVideoPrompts) return 7;
        if (generatedImages.length > 0 || isLoading) return 6;
        if (characterPreviews.length > 0 || isGeneratingChars) return 4;
        if (contextPreview) return 3;
        return 1;
    }, [thumbnailResults, isGeneratingThumbnail, videoPrompts, isGeneratingVideoPrompts, generatedImages, isLoading, characterPreviews, isGeneratingChars, contextPreview]);


    return (
        <div className="bg-gray-900 text-white min-h-screen font-sans flex flex-col">
            <input type="file" ref={contextFileInputRef} onChange={handleUploadContextImage} accept="image/*" className="hidden" />
            <Header 
                activeUser={activeUser}
                onSaveProject={handleSaveProject} 
                onLoadProject={handleLoadProject} 
                onShareProject={() => alert('Chức năng chia sẻ sẽ sớm được cập nhật!')} 
            />
            <main className="flex-grow flex flex-col items-center w-full p-4 md:p-6">
                <ProgressBar currentStep={currentStep} totalSteps={8} />
                {error && (
                    <div className={`p-3 rounded-md my-4 max-w-7xl w-full flex items-start gap-3 ${isQuotaExceeded ? 'bg-yellow-900/50 text-yellow-300' : 'bg-red-900/50 text-red-300'}`}>
                        <i className={`fas ${isQuotaExceeded ? 'fa-hourglass-half' : 'fa-exclamation-triangle'} mt-1`}></i>
                        <div>
                            <p className="font-bold">{isQuotaExceeded ? 'Đã đạt giới hạn sử dụng API' : 'Đã xảy ra lỗi'}</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    </div>
                )}
                <div className="flex flex-col md:flex-row w-full max-w-7xl mt-6 gap-6 flex-grow" style={{ minHeight: '60vh' }}>
                    <div className="w-full md:w-1/2 lg:w-1/3 bg-gray-800/50 p-6 rounded-lg shadow-xl border border-gray-700 flex flex-col">
                        {renderStepContent()}
                    </div>
                    <div className="w-full md:w-1/2 lg:w-2/3 bg-gray-800/50 p-6 rounded-lg shadow-xl border border-gray-700">
                        <PreviewDisplay
                            step={activeStepForPreview}
                            characters={characters}
                            contextPreview={contextPreview}
                            onRegenerateContext={handleGenerateContext}
                            onRegenerateSingleCharacter={handleGenerateSingleCharacter}
                            onSelectReferenceImage={(charId, url) => setCharacters(chars => 
                                chars.map(c => {
                                    if (c.id === charId) {
                                        // If it's already selected, deselect it. Otherwise, select it.
                                        const newRefUrl = c.referenceImageUrl === url ? null : url;
                                        return { ...c, referenceImageUrl: newRefUrl };
                                    }
                                    return c;
                                })
                            )}
                            seriesPrompts={seriesPrompts}
                            generatedImages={generatedImages}
                            onOpenEditModal={setEditingImage}
                            selectedImageIds={selectedImageIds}
                            onToggleImageSelection={handleToggleImageSelection}
                            onRegenerateSeriesImage={handleRegenerateSingleSeriesImage}
                            onRetryFailedSeries={handleRetryFailedSeriesImages}
                            videoPrompts={videoPrompts}
                            isGeneratingVideoPrompts={isGeneratingVideoPrompts}
                            onDownloadVideoPrompts={handleDownloadVideoPrompts}
                            thumbnailResults={thumbnailResults}
                            isGeneratingThumbnail={isGeneratingThumbnail}
                            onProceedToStep7={() => setCurrentStep(7)}
                            onProceedToStep8={() => setCurrentStep(8)}
                            isGeneratingChars={isGeneratingChars}
                            isGeneratingSeries={isLoading}
                            onStopGeneration={handleStopGeneration}
                            isQuotaExceeded={isQuotaExceeded}
                            referenceImages={referenceImages}
                        />
                    </div>
                </div>
            </main>
            {editingImage && (
                <EditImageModal
                    image={editingImage}
                    onClose={() => setEditingImage(null)}
                    onApply={handleApplyEdit}
                    language={scriptLanguage}
                    styleReferences={referenceImages}
                />
            )}
        </div>
    );
};

export default App;
