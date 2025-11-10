# Skimidi

Skimidi is a creative audio tool that reimagines your MIDI files. Upload a MIDI composition and a palette of your own sound samples, and Skimidi will generate a new piece of music, replacing each MIDI note with a pitch-shifted and time-stretched version of your sounds.

**Try the live demo:** [https://skimidi.netlify.app](https://skimidi.netlify.app)

## Features

-   **MIDI & Sound Upload:** Easily upload a MIDI file and multiple `.wav` sound samples.
-   **Custom Sound Palette:** Use any collection of sounds to create unique and unexpected results.
-   **Sound Layering:** Configure how many different sounds should be layered for each note to create richer textures.
-   **Real-time Progress:** Monitor the audio generation process as it happens.
-   **Direct Download:** Get a link to download your final `.wav` file once the processing is complete.

## How to Use

Using Skimidi is simple. Follow these steps on the website:

1.  **Upload Your MIDI:** Start by dragging and dropping or selecting a MIDI file (`.mid`). This file contains the musical structure (notes, timing, etc.) for your new song.

2.  **Provide Your Sounds:** Next, upload one or more short audio samples in `.wav` format. These are the sounds that will be used to "play" the notes from your MIDI file. Get creative—any sound can become an instrument!

3.  **Configure the Sound:**
    -   **Primary Sound:** Choose one of your uploaded sounds to be the main instrument.
    -   **Layering:** Decide how many additional sounds you want to layer on top of the primary sound for each note. This can create richer, more complex textures.

4.  **Start Processing:** Click the "Process" button to begin the audio generation. You'll see a progress bar updating in real-time.

5.  **Download Your Creation:** Once the process is complete, a download link for your new audio file (`.wav`) will appear. Click it to save and listen to your unique creation!

## How It Works

Skimidi's magic comes from a custom audio processing pipeline. When you upload your files, the application:

1.  Analyzes the pitch and duration of each of your sound samples.
2.  Reads every note from your MIDI file.
3.  For each note, it takes your chosen sound(s), digitally retunes them to match the note's pitch, and stretches them to fit the note's duration.
4.  Finally, it combines all these newly generated sounds into a single, cohesive audio file for you to download.