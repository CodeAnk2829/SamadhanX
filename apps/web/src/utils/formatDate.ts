export const formatDate = (isoString: string) =>{
    const date = isoString.split("T")[0];
    const time = isoString.split("T")[1].split(".")[0];
    const dateTime = `${date} ${time}`;
    return dateTime;
}
