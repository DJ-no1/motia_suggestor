import { EventConfig } from "motia"


// step 2 , 
//converting channel name to channel id using youtube api
export const config: EventConfig = {
    name: "ResolveChannelNameToId",
    type: "event",
    subscribes: ['yt.submit'],
    emits: ['yt.channelIdResolved', "yt.channel.error"]
}

export const handler = async (eventData: any, { emit, logger, state }: any) => {


    let jobId: string | undefined
    let email: string | undefined
    try {
        logger.info("Received yt.submit event in ResolveChannelNameToId ", { eventData: eventData });

        const data = eventData || {};
        jobId = data.jobId;
        email = data.email;
        const channelName = data.channelName;

        logger.info("Resolving channel name to id for channelName: ", { jobId, channelName });

        const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
        if (!YOUTUBE_API_KEY) {
            throw new Error("YOUTUBE_API_KEY not set in environment variables");
        }

        const jobData = await state.get(`job_${jobId}`);

        await state.set(`job_${jobId}`, {
            ...jobData,
            state: "resolving_channel_id",
        });

        let channelId: string | null = null;
        let channelNamer: string | null = null;

        if (channelName.startsWith("@")) {
            const handle = channelName.substring(1); // Remove '@' symbol

            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(
                handle
            )}&key=${YOUTUBE_API_KEY}`;
            const searchResponse = await fetch(searchUrl);
            const searchResult = await searchResponse.json();
            // docs of youtube api for reference : https://developers.google.com/youtube/v3/docs/search/list

            if (searchResult.items && searchResult.items.length > 0) {
                channelId = searchResult.items[0].snippet.channelId;
                channelNamer = searchResult.items[0].snippet.title;
            }

            else {
                const searchurl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&forUsername=${encodeURIComponent(
                    handle
                )}&key=${YOUTUBE_API_KEY}`;

                const searchresponse = await fetch(searchurl);
                const searchresult = await searchresponse.json();
                if (searchresult.items && searchresult.items.length > 0) {
                    channelId = searchresult.items[0].id;
                    channelNamer = searchresult.items[0].snippet.title;
                }
            }
        }


        if (!channelId) {
            logger.error("Channel ID not found for channelName: ", { channelName });

            await state.set(`job_${jobId}`, {
                ...jobData,
                state: "error",
                errorMessage: "Channel ID not found for the given channel name",
            });
        }
        await emit({
            topic: 'yt.',
            data: {
                jobId,
                email,

            }
        });
        return;


    } catch (error: any) {
        logger.error("Error in ResolveChannelNameToId handler ", { error: error.message })
        if (!jobId || !email) {
            logger.error("Missing jobId or email, cannot emit channel error event", { jobId, email });
            return;
        }

        const jobData = await state.get(`job_${jobId}`);


        await state.set(`job_${jobId}`, {
            ...jobData,
            state: "error",
            errorMessage: error.message,

        });

        await emit({
            topic: 'yt.channel.error',
            data: {
                jobId,
                email,
                error: 'failed to resolve channel name to id'
            }
        });
