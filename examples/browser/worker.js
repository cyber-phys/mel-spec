importScripts("./dist/mel_spec_pipeline.js");
importScripts("./ringbuffer.js");

const { SpeechToMel } = wasm_bindgen;

const instance = wasm_bindgen("./dist/mel_spec_pipeline_bg.wasm");

async function init_wasm_in_worker() {
  // Load the wasm file by awaiting the Promise returned by `wasm_bindgen`.

  await instance;

  console.log('Initializing worker')

  self.onmessage = async (event) => {
    const opt = event.data.options;

    const mod = SpeechToMel.new(
      opt.fftSize,
      opt.hopSize,
      opt.samplingRate,
      opt.nMels
    );
    console.log("init");
    const melBuf = ringbuffer(event.data.melSab, opt.nMels, 64, Uint8ClampedArray);
    const pcmBuf = ringbuffer(event.data.pcmSab, 128, 1024 * 4, Float32Array);

    while (true) {
      let samples = pcmBuf.pop();
      if (samples) {
        const res = mod.add(samples)
        console.log(res);
        if (res.ok) {
          let f = res.frame;
          f[0] = (res.va ? f[0] & ~ 1 : f[0] | 1);
          melBuf.push(f);
        }
      }
    }
  };
}

init_wasm_in_worker();