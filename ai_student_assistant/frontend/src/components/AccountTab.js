import React, {useEffect, useState} from "react";
import { FaUser } from "react-icons/fa";
import "./AccountTab.css";
import Navbar from "./Navbar";

const AccountTab = () => {
    const [userInfo, setUserInfo] = useState({username: '', email: '', avatar_url: '/default-avatar.png'});
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState('/default-avatar.png');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchUser = async () => {
            try{
                const res = await fetch('https://www.fallnik.com/api/user-info',{
                    credentials: "include"
                });

                const data = await res.json();
                if(res.ok){
                    setUserInfo(data);
                    setPreview(data.avatar_url || '/default-avatar.png');
                }
            }catch(err){
                console.error('Failed to fetch user info: ', err);
            }
        };

        fetchUser();
    }, []);

    const handleUpload = async () => {
        if(!file) return;

        const formData = new FormData();
        formData.append('avatar', file);

        try{
            const res = await fetch('https://www.fallnik.com/api/upload-avatar', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            const data = await res.json();
            if(res.ok){
                setMessage('Profile picture updated!');
                setPreview(data.avatar_url);
                window.location.reload();
            }else{
                setMessage(data.error || 'Upload failed');
            }
        }catch(err){
            console.error(err);
            setMessage('Server error');
        }
    };

    return(
        <div className="account-tab-wrapper">
            <Navbar />
            <div className="gradient-background"></div>
            <div className="grain-overlay"></div>
            <div className="blob-container">
            <div className="blob blob1"></div>
            <div className="blob blob2"></div>
            <div className="blob blob3"></div>
            <div className="blob blob4"></div>
            <div className="blob blob5"></div>
            </div>
        <div className="account-tab">
            

            <h2><FaUser />Account info</h2>

            <div className="info-section">
                <img src={preview} alt="avatar" style={{width: 100, height: 100, borderRadius: '50%'}} />
                <p><strong>Username: </strong> {userInfo.username}</p>
                <p><strong>Email: </strong> {userInfo.email}</p>
            </div>

            <div className="upload-section">
                <p style={{color:"white"}}><strong>Pick a new avatar for your account</strong></p>
                <input type="file" accept="image/*" onChange={e=> setFile(e.target.files[0])} /> 
                <button onClick={handleUpload}>Upload New Avatar</button>
                {message && <p>{message}</p>}
            </div>
        
        </div>
        </div>
    );
};

export default AccountTab;