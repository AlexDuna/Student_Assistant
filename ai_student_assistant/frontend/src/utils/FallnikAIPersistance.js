export async function loadPersistentStateFromServer() {
    try{
        const res= await fetch("https://www.fallnik.com/api/user-data",{
            method:"GET",
            credentials:"include"
        });

        if(!res.ok) return null;

        return await res.json();
    }catch(e){
        console.error("Failed to fetch user data from server", e);
        return null;
    }
}

export async function savePersistentStateToServer(state){
    try{
        await fetch("https://www.fallnik.com/api/user-data",{
            method:"POST",
            credentials:"include",
            headers:{
                "Content-Type" : "application/json"
            },
            body: JSON.stringify(state)
        });
    }catch(e){
        console.error("Failed to save user data from server", e);
    }
}