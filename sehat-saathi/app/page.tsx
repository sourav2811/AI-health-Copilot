import Copilot from './copilot';
import {getChatGPTUser} from './chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Home(){const user=await getChatGPTUser();return <Copilot signedIn={!!user}displayName={user?.displayName||'Guest'}/>;}
