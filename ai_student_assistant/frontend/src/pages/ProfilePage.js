import React, {useState} from "react";
import AccountTab from "../components/AccountTab";
import SettingsTab from "../components/SettingsTab";
import "./ProfilePage.css";

const ProfilePage=()=>{
    const [activeTab, setActiveTab] = useState("account");

    return(
        <div className="profile-page">
            <div className="tab-header">
                <button 
                    className={activeTab === "account" ? "active" : ""}
                    onClick={() => setActiveTab("account")}
                >
                    Account
                </button>
                <button
                    className={activeTab === "settings" ? "active" : ""}
                    onClick={() => setActiveTab("settings")}
                >
                    Settings
                </button>
            </div>

            <div className="tab-content">
                {activeTab === "account" ? <AccountTab /> : <SettingsTab />}
            </div>
        </div>
    );
};

export default ProfilePage;