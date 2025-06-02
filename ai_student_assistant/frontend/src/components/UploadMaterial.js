import React from "react";
import "../pages/FallnikAIPage.css";

const UploadMaterial = ({
    file,
    onFileChange,
    onUpload,
    uploadLoading,
    uploadError
}) => {
    return (
        <div className="upload-area">
            <h3>Upload Material (PDF, DOCX, TXT)</h3>
            <input type="file" onChange={onFileChange} />
            <button onClick={onUpload} disabled={uploadLoading || !file}>
                {uploadLoading ? "Summarizing..." : "Upload & Summarize"}
            </button>
            {uploadError && <div className="error-message">{uploadError}</div>}
        </div>
    );
};

export default UploadMaterial;