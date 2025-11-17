import React from 'react';
import type { ImageResult } from '../App';

interface ImageReferenceManagerProps {
    images: ImageResult[];
    onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onDelete: (id: string) => void;
}

const ImageReferenceManager: React.FC<ImageReferenceManagerProps> = ({ images, onUpload, onDelete }) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-400">
                Tải lên các hình ảnh mà bạn muốn AI học hỏi theo phong cách (ánh sáng, bố cục, màu sắc, v.v.).
                Những hình ảnh này sẽ được sử dụng làm tài liệu tham khảo để hướng dẫn quá trình tạo ra các hình ảnh mới.
            </p>
            <label
                htmlFor="reference-upload"
                className="w-full cursor-pointer bg-teal-600 hover:bg-teal-500 rounded p-3 text-lg flex items-center justify-center gap-2 transition-colors"
            >
                <i className="fas fa-upload"></i>
                Tải lên ảnh tham khảo
            </label>
            <input
                type="file"
                id="reference-upload"
                ref={fileInputRef}
                onChange={onUpload}
                accept="image/*"
                multiple
                className="hidden"
            />
            {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 max-h-96 overflow-y-auto pr-2">
                    {images.map(image => (
                        <div key={image.id} className="relative group aspect-square">
                            <img
                                src={image.url!}
                                alt="Reference"
                                className="w-full h-full object-cover rounded-md"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                    onClick={() => onDelete(image.id)}
                                    className="text-white bg-red-600 hover:bg-red-700 w-10 h-10 rounded-full flex items-center justify-center"
                                    title="Xóa ảnh này"
                                >
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ImageReferenceManager;
