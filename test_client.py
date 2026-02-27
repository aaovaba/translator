import asyncio
import websockets
import json

async def test():
    uri = "ws://127.0.0.1:8000/ws"

    async with websockets.connect(uri) as websocket:

        await websocket.send("Namaskar doctor, aap kaise hain?")  # test patient message

        consent_message = await websocket.recv()
        print("Consent message:", consent_message)

        await websocket.send("haan ji")  # test denial

        response = await websocket.recv()
        print("System:", response)

        if "denied" in response.lower():
            print("Session closed by server.")
            return

        # Only continue if consent granted
        await websocket.send(json.dumps({
            "speaker": "patient",
            # "text": "Me duele mucho cuando respiro"
            "text": "aaj mujhe sir me dard ho raha hai"
        }))

        translated = await websocket.recv()
        print("Translation:", translated)

asyncio.run(test())