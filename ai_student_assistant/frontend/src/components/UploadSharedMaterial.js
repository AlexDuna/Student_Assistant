import React, {useState, useEffect, useRef} from "react";
import { API_URL } from "../utils/config";

const UploadSharedMaterial = ({sessionCode}) => {
    const [file, setFile] = useState(null);
    const [uploadedUrl, setUploadedUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [textContent, setTextContent] = useState(null);
    const fileInputRef = useRef(null);

    const fetchSharedMaterial = async () => {
        try{
            const res = await fetch ( `${API_URL}/sessions/${sessionCode}/material`,{
                credentials: "include"
            });

            if(res.ok){
                const data= await res.json();
                setUploadedUrl(data.file_url);
            }
        }catch(err){
            console.error("Failed to fetch material", err);
        }
    };

    useEffect(() => {
        fetchSharedMaterial();
    }, [sessionCode]);


    useEffect (() => {
        if(uploadedUrl && uploadedUrl.endsWith(".txt")){
            fetch(uploadedUrl)
                .then((res) => res.text())
                .then((text) => setTextContent(text))
                .catch(() => setTextContent("Failed to load text content"));
        }else{
            setTextContent(null);
        }
    }, [uploadedUrl]);

    const handleUpload = async () => {
        if(!file) return;

        const formData = new FormData();
        formData.append("file", file);

        setUploading(true);
        try{
            const res = await fetch(`${API_URL}/sessions/${sessionCode}/material`,{
                method: "POST",
                body: formData,
                credentials: "include"
            });
            const data = await res.json();
            setUploadedUrl(data.file_url);
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }catch(err){
            console.error("Upload failed", err);
        }finally{
            setUploading(false);
        }
    };

    return (
        <div>
            <input 
                ref={fileInputRef}
                type="file" 
                accept=".pdf, .docx, .txt" 
                onChange={(e) => setFile(e.target.files[0])} 
            />
            <button onClick={handleUpload} disabled={uploading || !file}>
                {uploading ? "Uploading..." : "Upload"}
            </button>

            {uploadedUrl && (
                <div style={{marginTop: "1rem"}}>
                    <a href={uploadedUrl} target="_blank" rel="noopener noreferrer">
                        📄View Shared Material
                    </a>

                    {uploadedUrl.endsWith(".pdf") && (
                        <iframe
                            src={uploadedUrl}
                            title="Shared PDF"
                            width="100%"
                            height="500px"
                            style={{marginTop: "1rem", border: "1px solid #ccc", borderRadius:"8px"}}
                        />
                    )}

                    {!uploadedUrl.endsWith(".pdf") && !uploadedUrl.endsWith(".txt") && (
                        <p style={{marginTop: "1rem", color: "#888"}}>
                            Uploaded file can't be previewed. Click the link above to download.
                        </p>
                    )}
                </div>
            )}

            {textContent && (
                <pre 
                    style={{
                        whiteSpace: "pre-wrap",
                        background: "#eee",
                        padding: "1rem",
                        borderRadius: "8px",
                        marginTop: "1rem",
                        color: "black",
                    }}
                >
                    {textContent}
                </pre>
            )}
        </div>
    );
};

export default UploadSharedMaterial;