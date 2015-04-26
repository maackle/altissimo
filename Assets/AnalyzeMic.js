#pragma strict

public var SAMPLES = 512;
public var FREQS = 1024;
public var SAMPLE_RATE = 44100;
public var source : AudioSource;
public var micInput : String = null;
public var outputFreq : float;

private var sampleData : float[];
private var freqData : float[];
private var freqDataRaw : float[];

function Start () {
	LogInfo();
	var duration = 1.0 / 30.0;
	sampleData = new Array(SAMPLES);
	freqData = new Array(FREQS);
	freqDataRaw = new Array(FREQS);
	source.clip = Microphone.Start(micInput, true, 1, SAMPLE_RATE);
	while (Microphone.GetPosition(micInput) <= 0) {
		WaitForSeconds(0.01);
		// wait...
	}
	source.Play();
	source.loop = true;
}

function LogInfo() {
	var minFreq : int;
	var maxFreq : int;
	Microphone.GetDeviceCaps(micInput, minFreq, maxFreq);
	Debug.Log("min/max freq: " + minFreq + " " + maxFreq);
	// Debug.Log("camera pixel width " + GetComponent.<Camera>().pixelWidth);

}

function Update () {
	outputFreq = GetFundamentalFreqEstimate();
}

function BinToHz(binNum : int) {
	return parseFloat(binNum) * SAMPLE_RATE / FREQS;
}

function HzToBin(hz : float) {
	return hz * FREQS / SAMPLE_RATE;
}

function HzToMidi(hz : float) {
	return hz == 0 ? 0 : 12 * Mathf.Log(hz / 440, 2) + 69;
}

function CopyData(data : float[]) {
	var weight = 1.0;
	for (var bin=0; bin < freqData.Length / 2; bin++) {
		freqData[bin] *= (weight - 1);
		freqData[bin] += weight * data[bin];
	}
}

function GetFundamentalFreqEstimate () {
	source.GetSpectrumData(freqDataRaw, 0, FFTWindow.Hamming);
	CopyData(freqDataRaw);  // unnecessary for now
	var bin : int;
	var maxBin : float = -1.0;
	var maxVal = 0.0;
	var copyWeight = 0.5;
	for (bin=0; bin < freqDataRaw.Length / 2; bin++) {
		var d = freqDataRaw[bin];
		var logb = Mathf.Log(bin, 2);
		var dampening : float = 1 / logb;
		if (maxBin >= 0) {
			// suppress bins close to multiples of the last peak found
			var ratio = bin / maxBin;
			if (Mathf.Abs(ratio - Mathf.Round(ratio)) < 0.1) {
				dampening *= 0.1;
			}
		}
		if (d * dampening > maxVal) {
			maxBin = parseFloat(bin);
			maxVal = d;
		}
		freqData[bin] = freqData[bin] * (1 - copyWeight) + d * dampening * copyWeight;
		// sum += y;
	}

	for (bin=0; bin < freqDataRaw.Length / 2; bin++) {

	}

	var x = 0.0;
	for (bin=0; bin < freqData.Length / 2; bin++) {
		var y = 100 * freqData[bin];
		if (bin == maxBin) {
			Debug.DrawLine(Vector3(x, 0, 0), Vector3(x, y, 0), Color.green);
		} else {
			Debug.DrawLine(Vector3(x, 0, 0), Vector3(x, y, 0), Color.white);
		}
		x += 0.003;
	}
	return BinToHz(maxBin);
}