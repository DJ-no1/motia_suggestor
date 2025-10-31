import { EventConfig } from "motia"


// step 3 , 
// retrievs the latest video from the channel id and store it in state
export const config: EventConfig = {
    name: "fetchVideos",
    type: "event",
    input: {} as any,
    subscribes: ['yt.channel.Resolved'],
    emits: ['yt.videos.fetched', "yt.videos.error"]
}
interface Video{
    videoId: string;
    title: string;
    publishedAt: string;
    thumbnail: string;
    url: string;
}
export const handler = async (eventData: any, { emit, logger, state }: any) => {


    let jobId: string | undefined
    let email: string | undefined




     try {
        const data = eventData || {};
        jobId = data.jobId;
        email = data.email;
        const channelId = data.channelId;
        const channelNamer = data.channelNamer;

        logger.info("Received yt.channel.Resolved event in fetchVideos ", { jobId, channelId });

        const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
        if (!YOUTUBE_API_KEY) {
            throw new Error("YOUTUBE_API_KEY not set in environment variables");
        }

        const jobData = await state.get(`job_${jobId}`);

        await state.set(`job_${jobId}`, {
            ...jobData,
            state: "fetching_videos",
        });

        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=5&order=date&type=video&key=${YOUTUBE_API_KEY}`;

        

    } catch (error: any) {
        logger.error("Error fetching videos  ", { error: error.message })
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
            topic: 'yt.videos.error',
            data: {
                jobId,
                email,
                error: 'failed to fetch videos. please try again later'
            }
        });
    }
};
