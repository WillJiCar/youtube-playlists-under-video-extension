
export const convertImageToBase64 = async (url: string) => {
    try{
        const res = await fetch(url);
        const blob = await res.blob();

        return new Promise<string | null>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string | null);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch(err){
        console.log("Error converting to base64", err);
    }
}