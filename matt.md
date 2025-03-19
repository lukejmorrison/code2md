# Project: vp

## Table of Contents

- [../../../../../opt/caddy/html/reveal/public/wasm_input_reflect/index.html](#file-index-html)
- [../../../../../opt/caddy/html/reveal/public/wasm_spectrometer/old/lib-0.0.1.rs](#file-lib-0-0-1-rs)
- [../../../../../opt/caddy/html/reveal/public/wasm_input_reflect/Cargo.lock](#file-cargo-lock)

## File: ../../../../../opt/caddy/html/reveal/public/wasm_input_reflect/index.html <a id="file-index-html"></a>

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wasm Input Reflect</title>
</head>
<body>
    <script type="module">
        import init from './pkg/wasm_input_reflect.js';
        init();
    </script>
</body>
</html>
```

## File: ../../../../../opt/caddy/html/reveal/public/wasm_spectrometer/old/lib-0.0.1.rs <a id="file-lib-0-0-1-rs"></a>

```rust
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{AudioContext, AnalyserNode, HtmlElement, HtmlAudioElement, SvgElement, SvgRectElement, Window, Document, console};
use std::rc::Rc;
use std::cell::RefCell;
use std::sync::atomic::{AtomicBool, Ordering};
use lazy_static::lazy_static;

//constants spectrograms
const MEL_BINS: usize = 128;
const LOG_BINS: usize = 128;
const MIN_BAR_HEIGHT: u16 = 2;       // Minimum height for non-zero values
const FOCUS_FREQUENCY_RANGE: bool = true;  // Focus bins on useful frequency range
const USE_SMOOTHING: bool = true;    // Apply smoothing between bins
const USE_SPLINE_INTERPOLATION: bool = true;

const INTERPOLATION_FACTOR: usize = 2;  // Higher = smoother curve, reduced to 2 from 4


const LOG_SPEC_GAP_FILL: bool = true;  // Special gap filling for log spectrogram
const LOG_SPEC_GAP_THRESHOLD: u8 = 10; // Minimum value to trigger gap fill
//const LOG_SPEC_GAP_RADIUS: usize = 2;  // Number of neighbors to fill
//const LOG_SPEC_GAP_FILL_FACTOR: f32 = 0.5; // Factor for gap fill
const LOG_SPEC_MIN_VALUE: u8 = 10;    // Minimum value for log spectrogram
const LOG_SPEC_MAX_VALUE: u8 = 255;   // Maximum value for log spectrogram
const USE_A_WEIGHTING: bool = true;  // Apply perceptual weighting to match human hearing
const NOISE_GATE_THRESHOLD: f32 = 5.0; // Threshold for noise gate (0-255)
const LOW_FREQ_ATTENUATION: f32 = 0.4; // Stronger attenuation for lowest frequencies
const HIGH_FREQ_ATTENUATION: f32 = 0.8; // Less attenuation for higher frequencies
const SMOOTHING_FACTOR: f32 = 0.6;    // Strength of the exponential smoothing

const SMOOTHING_ITERATIONS: usize = 2; // Number of smoothing iterations, reduced to 2 from 3
const SMOOTHING_PASSES: usize = 2;     // Number of smoothing passes, reduced to 2 from 3

const SMOOTHING_RADIUS: usize = 2;     // Radius of the smoothing filter
const SMOOTHING_FACTOR_DB: f32 = 0.5;  // Strength of the dB smoothing
const SMOOTHING_ITERATIONS_DB: usize = 2; // Number of dB smoothing iterations
const SMOOTHING_PASSES_DB: usize = 2;  // Number of dB smoothing passes
const SMOOTHING_RADIUS_DB: usize = 2;  // Radius of the dB smoothing filter
const SPLINE_TENSION: f32 = 0.5;       // Tension of the cubic spline interpolation
const SPLINE_ITERATIONS: usize = 3;    // Number of spline smoothing iterations

const SPLINE_PASSES: usize = 2;        // Number of spline smoothing passes, reduced to 2 from 3

const SPLINE_RADIUS: usize = 2;        // Radius of the spline filter
const SPLINE_TENSION_DB: f32 = 0.5;    // Tension of the dB spline interpolation
const SPLINE_ITERATIONS_DB: usize = 2; // Number of dB spline smoothing iterations
const SPLINE_PASSES_DB: usize = 2;     // Number of dB spline smoothing passes
const SPLINE_RADIUS_DB: usize = 2;     // Radius of the dB spline filter

const SVG_VIEWBOX_HEIGHT: u32 = 400;   // Height of the SVG viewbox
const SVG_VIEWBOX_WIDTH: u32 = 800;    // Width of the SVG viewbox


lazy_static! {
    static ref DEBUG: AtomicBool = AtomicBool::new(false);
    static ref PREVENT_SVG_UPDATE: AtomicBool = AtomicBool::new(false);
    static ref USE_LOG_SPECTROGRAM: AtomicBool = AtomicBool::new(false); // Add this line// Add at the top with other globals
    static ref PAGE_VISIBLE: AtomicBool = AtomicBool::new(true);
    }

// Only update if page is visible
#[wasm_bindgen]
pub fn set_page_visibility(visible: bool) {
    PAGE_VISIBLE.store(visible, Ordering::SeqCst);
}

// Add this new function to toggle between spectrograms
#[wasm_bindgen]
pub fn set_use_log_spectrogram(value: bool) {
    USE_LOG_SPECTROGRAM.store(value, Ordering::SeqCst);
}

// Define thread-local storage at the module level
thread_local! {
    static AUDIO_CONTEXT: RefCell<Option<AudioContext>> = RefCell::new(None);
    static ANALYSER: RefCell<Option<AnalyserNode>> = RefCell::new(None);
    static PREVIOUS_HEIGHTS: RefCell<Vec<u16>> = RefCell::new(Vec::new());
    static PREVIOUS_COLORS: RefCell<Vec<String>> = RefCell::new(Vec::new());
    static PREVIOUS_ACTIVE: RefCell<Vec<bool>> = RefCell::new(Vec::new());

}

#[wasm_bindgen]
pub fn set_debug(value: bool) {
    DEBUG.store(value, Ordering::SeqCst);
}

#[wasm_bindgen]
pub fn set_prevent_svg_update(value: bool) {
    PREVENT_SVG_UPDATE.store(value, Ordering::SeqCst);
}

#[wasm_bindgen]
pub fn get_audio_context() -> Option<AudioContext> {
    // Return the current audio context if it exists
    AUDIO_CONTEXT.with(|ctx| ctx.borrow().clone())
}

#[wasm_bindgen]
pub fn get_analyser() -> Option<AnalyserNode> {
    // Return the current analyser if it exists
    ANALYSER.with(|a| a.borrow().clone())
}

#[wasm_bindgen(start)]
pub fn start() -> Result<(), JsValue> {
    // Set up console error handling for better debugging
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
    
    let window = web_sys::window().expect("no global `window` exists");
    let document = window.document().expect("should have a document on window");
    
    // Use the container instead of body
    let container = document.get_element_by_id("container")
        .ok_or_else(|| JsValue::from_str("Could not find container element"))?;
    let container_elem = container.dyn_into::<HtmlElement>()?;

    let audio = create_audio_element(&document, &container_elem)?;
    let svg = create_svg_element(&document, &container_elem)?;
    
    let (audio_context, analyser, buffer_length, sample_rate, fft_size) = 
        setup_audio_processing(&audio)?;

    //debug_log("Created audio context");

    setup_playback_handler(&audio, &audio_context)?;

    setup_visualization_loop(
        window, 
        document, 
        svg, 
        analyser, 
        buffer_length, 
        sample_rate, 
        fft_size
    )?;
    //debug_log("setp visualisation loop");
    
    Ok(())
}

fn create_audio_element(document: &Document, body: &HtmlElement) -> Result<HtmlAudioElement, JsValue> {
    let audio = document.create_element("audio")?.dyn_into::<HtmlAudioElement>()?;
    audio.set_src("./audio.mp3");
    audio.set_controls(true);
    body.append_child(&audio)?;
    Ok(audio)
}

fn create_svg_element(document: &Document, body: &HtmlElement) -> Result<SvgElement, JsValue> {
    let svg = document.create_element_ns(Some("http://www.w3.org/2000/svg"), "svg")?.dyn_into::<SvgElement>()?;
    svg.set_attribute("width", "100%")?;
    svg.set_attribute("height", &SVG_VIEWBOX_HEIGHT.to_string())?;
    svg.set_attribute("viewBox", &format!("0 0 {} {}", SVG_VIEWBOX_WIDTH, SVG_VIEWBOX_HEIGHT))?;
    body.append_child(&svg)?;
    Ok(svg)
}


// Store the objects in thread_local storage
fn setup_audio_processing(audio: &HtmlAudioElement) 
    -> Result<(AudioContext, AnalyserNode, u32, f32, f32), JsValue> {
    let audio_context = AudioContext::new()?;
    let analyser = audio_context.create_analyser()?;
    analyser.set_smoothing_time_constant(0.85);
    analyser.set_fft_size(256);
    let buffer_length = analyser.frequency_bin_count();
    let sample_rate = audio_context.sample_rate();
    let fft_size = analyser.fft_size() as f32;
   
    // Store for later access - use the module-level thread_local storage
    AUDIO_CONTEXT.with(|ctx| *ctx.borrow_mut() = Some(audio_context.clone()));
    ANALYSER.with(|a| *a.borrow_mut() = Some(analyser.clone()));

    let source = audio_context.create_media_element_source(audio)?;
    source.connect_with_audio_node(&analyser)?;
    analyser.connect_with_audio_node(&audio_context.destination())?;

    Ok((audio_context, analyser, buffer_length, sample_rate, fft_size))
}

fn setup_playback_handler(audio: &HtmlAudioElement, audio_context: &AudioContext) -> Result<(), JsValue> {
    let audio_context_clone = audio_context.clone();
    let closure = Closure::wrap(Box::new(move || {
        let _ = audio_context_clone.resume();
    }) as Box<dyn FnMut()>);
    audio.set_onplay(Some(closure.as_ref().unchecked_ref()));
    audio.set_onpause(Some(closure.as_ref().unchecked_ref()));
    closure.forget(); // Avoid lifetime issues by leaking the closure
    Ok(())
}

fn create_svg_rects(document: &Document, svg: &SvgElement, count: u32) -> Result<Vec<SvgRectElement>, JsValue> {
    // First, add a style element to the SVG for more efficient styling
    //let style = document.create_element_ns(Some("http://www.w3.org/2000/svg"), "style")?;
    // style.set_text_content(Some(r#"
    //     rect {
    //         fill: #4a8eff;
    //         transition: height 0.05s ease;
    //     }
    //     rect.active {
    //         fill: #5a9eff;
    //     }
    // "#));
    //svg.append_child(&style)?;

    let bar_width = SVG_VIEWBOX_WIDTH as f64 / count as f64;
    let mut x = 0.0;
    
    let mut rects = Vec::with_capacity(count as usize);
    // Use underscore to indicate intentional unused variable
    for _ in 0..count {
        let rect = document.create_element_ns(Some("http://www.w3.org/2000/svg"), "rect")?
            .dyn_into::<SvgRectElement>()?;
            
        // Set initial attributes
        rect.set_attribute("y", &SVG_VIEWBOX_HEIGHT.to_string())?; // Start at bottom
        rect.set_attribute("height", "0")?;
        rect.set_attribute("x", &x.to_string())?;
        //rect.set_attribute("width", &(bar_width * 0.9).to_string())?;
        
        svg.append_child(&rect)?;
        rects.push(rect);

        x += bar_width;  // Increment for next rect
    }
    Ok(rects)
}


fn setup_visualization_loop(
    window: Window,
    document: Document,
    svg: SvgElement,
    analyser: AnalyserNode,
    buffer_length: u32,
    sample_rate: f32,
    fft_size: f32
) -> Result<(), JsValue> {

    // debug animation loop
    if DEBUG.load(Ordering::SeqCst) {
        console::log_1(&JsValue::from_str("Animation frame running"));
    }



    // Use the max of MEL_BINS and LOG_BINS since we might switch between them
    let num_bins = MEL_BINS.max(LOG_BINS);
    let rects: Vec<SvgRectElement> = create_svg_rects(&document, &svg, num_bins as u32)?;
    
    let draw: Rc<RefCell<Option<Closure<dyn FnMut()>>>> = Rc::new(RefCell::new(None));
    let draw_clone = draw.clone();
    
    // Pre-allocate these buffers to avoid frequent allocations
    let data_array = Rc::new(RefCell::new(vec![0u8; buffer_length as usize]));
    let processed_data = Rc::new(RefCell::new(vec![0u8; num_bins]));
    let data_array_clone = data_array.clone();
    let processed_data_clone = processed_data.clone();

    // Add throttling to avoid excessive updates
    let update_interval_ms = 90; // ~40 fps instead of unrestricted
    let mut last_update = js_sys::Date::now();
    
    // Clone window before moving it into the closure
    let window_for_closure = window.clone();
    //let current_time = js_sys::Date::now();
    
    // frame counter here
    let frame_count = Rc::new(RefCell::new(0u32));
    let frame_count_clone = frame_count.clone();
    
    *draw_clone.borrow_mut() = Some(Closure::wrap(Box::new(move || {

        // Increment frame counter and log
        let mut count = frame_count_clone.borrow_mut();
        *count += 1;
        if *count % 30 == 0 && DEBUG.load(Ordering::SeqCst) {
            console::log_1(&JsValue::from_str(&format!("Frame #{}", *count)));
        }

        
        // Extract frequency data
        let mut data = data_array_clone.borrow_mut();

        //get data from the analyser
        analyser.get_byte_frequency_data(&mut data);

        //debug check
        if DEBUG.load(Ordering::SeqCst) {
            let non_zero_count = data.iter().filter(|&&x| x > 0).count();
            console::log_1(&JsValue::from_str(&format!(
                "Audio data: {} bytes, {} non-zero", data.len(), non_zero_count
            )));
           
            // audio context debug code:
            AUDIO_CONTEXT.with(|ctx| {
                if let Some(ctx) = ctx.borrow().as_ref() {
                    let state_val = js_sys::Reflect::get(&ctx, &JsValue::from_str("state")).unwrap_or(JsValue::NULL);
                    console::log_1(&JsValue::from_str(&format!("Audio context state: {:?}", state_val)));
                }
            });
        }
        
        // Get current time INSIDE the animation loop
        let current_time = js_sys::Date::now();

        
        // Throttle updates to improve performance
        if current_time - last_update >= update_interval_ms as f64 && 
           !PREVENT_SVG_UPDATE.load(Ordering::SeqCst) &&
           PAGE_VISIBLE.load(Ordering::SeqCst) {
            
            // Process and update visualization
            let mut processed = processed_data_clone.borrow_mut();
            process_audio_data(&data, &mut processed, sample_rate, fft_size);
            update_visualization(&rects, &processed, num_bins as u32, sample_rate, fft_size);
            
            last_update = current_time;
        }

        // Schedule next frame
        window_for_closure.request_animation_frame(
            draw.borrow().as_ref().unwrap().as_ref().unchecked_ref()
        ).ok();
    }) as Box<dyn FnMut()>));

    // // Start the animation loop (if visible)
    // if current_time - last_update >= update_interval_ms as f64 && 
    //     !PREVENT_SVG_UPDATE.load(Ordering::SeqCst) && 
    //     PAGE_VISIBLE.load(Ordering::SeqCst) {
            window.request_animation_frame(draw_clone.borrow().as_ref().unwrap().as_ref().unchecked_ref())?;
            std::mem::forget(draw_clone);
    // }
    
    Ok(())
}

fn update_visualization(
    rects: &[SvgRectElement], 
    data_array: &[u8],
    num_bins: u32,
    sample_rate: f32,
    fft_size: f32
) {
    //send num_bins to console
    //debug_log(&format!("Updating visualization with {} bins", num_bins));

    let bar_width = SVG_VIEWBOX_WIDTH as f64 / num_bins as f64;
    let mut x = 0.0;

    // Choose which spectrogram to use
    let mut raw_spectrogram_data = if USE_LOG_SPECTROGRAM.load(Ordering::SeqCst) {
        convert_to_log_spectrogram(data_array, sample_rate, fft_size)
    } else {
        convert_to_mel_spectrogram(data_array, sample_rate, fft_size)
    };
    
    // Apply smoothing only if enabled
    if USE_SMOOTHING {
        raw_spectrogram_data = apply_smoothing(&raw_spectrogram_data);
    }

    // Apply normalization
    let spectrogram_data = normalize_spectrogram(&raw_spectrogram_data);
    
    // Find the actual max value for scaling (avoid division by zero)
    let max_value = spectrogram_data.iter()
        .fold(1u8, |max, &val| max.max(val)) as f64;
    
        // if DEBUG.load(Ordering::SeqCst) {
        //     console::log_1(&JsValue::from_str(&format!("Max value: {}", max_value)));
        // }

    // Update each rectangle
    for (i, &value) in spectrogram_data.iter().enumerate() {
        if i >= rects.len() {
            break;
        }
        
        let value_f = value as f64;
        
        // Apply minimum height for any non-zero value
        let bar_height = if value > 0 {
            ((value_f / max_value) * SVG_VIEWBOX_HEIGHT as f64) as u16
        } else {
            0
        }.max(if value > 0 { MIN_BAR_HEIGHT } else { 0 });
        
        // Send data to console
        // if DEBUG.load(Ordering::SeqCst) && i % 10 == 0 {  // Only log every 10th bar to avoid console spam
        //     console::log_1(&JsValue::from_str(&format!(
        //         "Bar {}: value={}, height={}", i, value, bar_height
        //     )));
        // }


        let rect = &rects[i];
        
        // Change color intensity based on relative energy
        // This makes the visualization more informative
        let intensity = (value_f / max_value) * 100.0;

        // Add debug logs for intensity values
        if DEBUG.load(Ordering::SeqCst) && i % 16 == 0 {  // Only log every 16th bar
            console::log_1(&JsValue::from_str(&format!(
                "Bar {}: value={}, max={}, intensity={:.2}", 
                i, value, max_value, intensity
            )));
        }

        // Create a dynamic color gradient from blue to red based on intensity
        let color = if intensity <= 0.0 {
            "#1a5ecf".to_string() // Darkest blue for zero
        } else {
            // Convert intensity (0-100) to a color on a blue-to-red gradient
            // Blue component decreases with intensity
            let blue = (255.0 - (intensity * 2.55)).max(0.0).min(255.0) as u8;
            // Red component increases with intensity
            let red = (intensity * 2.55).max(0.0).min(255.0) as u8;
            // Green component creates cyan/purple transitions
            let green = if intensity < 50.0 {
                (intensity * 2.55 * 0.7).max(0.0).min(255.0) as u8 // Some green for low values
            } else {
                ((100.0 - intensity) * 2.55 * 0.7).max(0.0).min(255.0) as u8 // Decrease for high values
            };
            
            format!("#{:02x}{:02x}{:02x}", red, green, blue)
        };
        
        // Only update class if activation state has changed
        let is_active = value > 3;
        PREVIOUS_ACTIVE.with(|prev_active| {
            let mut active_states = prev_active.borrow_mut();
            if active_states.len() != rects.len() {
                *active_states = vec![false; rects.len()];
            }

            // Only update if the active state has changed
            if is_active != active_states[i] {
                if is_active {
                    rect.set_attribute("class", "active").ok();
                } else {
                    rect.set_attribute("class", "").ok();
                }
                active_states[i] = is_active;
            }
        });
        
        // Set the fill color directly for more visual information, if it changes
        PREVIOUS_COLORS.with(|prev_colors| {
            let mut colors = prev_colors.borrow_mut();
            if colors.len() != rects.len() {
                *colors = vec!["".to_string(); rects.len()];
            }

            // Only update fill if color has changed
            if color != colors[i] {
                rect.set_attribute("fill", &color).ok();
                colors[i] = color;
            }
        });
        
        // Update position and dimensions
        // rect.set_attribute("x", &x.to_string()).ok();
        // rect.set_attribute("y", &(400 - bar_height).to_string()).ok();
        // rect.set_attribute("height", &bar_height.to_string()).ok();
        // rect.set_attribute("width", &(bar_width * 0.9).to_string()).ok();
        // Update position and dimensions
        rect.set_attribute("x", &x.to_string()).ok();
        //rect.set_attribute("width", &(bar_width * 0.9).to_string()).ok();


        // Only update height if changed significantly
        PREVIOUS_HEIGHTS.with(|prev_heights| {
            let mut heights = prev_heights.borrow_mut();
            if heights.len() != rects.len() {
                *heights = vec![0; rects.len()];
            }

            let height_change = (bar_height as i32 - heights[i] as i32).abs();
            if height_change > 8 || heights[i] == 0 || bar_height == 0 {
                rect.set_attribute("y", &(400 - bar_height).to_string()).ok();
                rect.set_attribute("height", &bar_height.to_string()).ok();
                heights[i] = bar_height;
            }
        });
        
        x += bar_width;
    }
}

fn convert_to_mel_spectrogram(data_array: &[u8], sample_rate: f32, fft_size: f32) -> Vec<u8> {
    // Pre-compute mel filter bank only once per sample rate
    // This can be cached with thread_local! if the sample rate doesn't change
    thread_local! {
        static MEL_FILTER_BANK: RefCell<Option<(f32, Vec<(Vec<usize>, Vec<f32>)>)>> = RefCell::new(None);
    }
    
    let num_mel_bins = MEL_BINS;
    let mut mel_data = vec![0.0_f32; num_mel_bins];
    
    // Check if we need to recompute the filter bank
    let filter_bank = MEL_FILTER_BANK.with(|filter_bank_cell| {
        let mut filter_bank = filter_bank_cell.borrow_mut();
        
        if filter_bank.is_none() || filter_bank.as_ref().unwrap().0 != sample_rate {
            // Pre-compute mel filter banks
            let min_freq: f32 = 20.0;
            let max_freq: f32 = sample_rate / 2.0;
            
            let min_mel = 2595.0 * (1.0 + min_freq / 700.0).log10();
            let max_mel = 2595.0 * (1.0 + max_freq / 700.0).log10();
            
            let mut filter_indexes = Vec::with_capacity(num_mel_bins);
            let mut filter_weights = Vec::with_capacity(num_mel_bins);
            
            let fft_bin_count = data_array.len();
            
            // For each mel bin, pre-compute which FFT bins contribute to it
            for j in 0..num_mel_bins {
                let mel_low = min_mel + (max_mel - min_mel) * (j as f32 / (num_mel_bins + 1) as f32);
                let mel_center = min_mel + (max_mel - min_mel) * ((j + 1) as f32 / (num_mel_bins + 1) as f32);
                let mel_high = min_mel + (max_mel - min_mel) * ((j + 2) as f32 / (num_mel_bins + 1) as f32);
                
                let hz_low = 700.0 * (10.0_f32.powf(mel_low / 2595.0) - 1.0);
                let hz_center = 700.0 * (10.0_f32.powf(mel_center / 2595.0) - 1.0);
                let hz_high = 700.0 * (10.0_f32.powf(mel_high / 2595.0) - 1.0);
                
                let mut bin_indexes = Vec::new();
                let mut weights = Vec::new();
                
                // Find which FFT bins contribute to this mel bin
                for i in 0..fft_bin_count {
                    let freq_hz = i as f32 * sample_rate / fft_size;
                    
                    if freq_hz >= hz_low && freq_hz <= hz_high {
                        let weight = if freq_hz <= hz_center {
                            (freq_hz - hz_low) / (hz_center - hz_low)
                        } else {
                            (hz_high - freq_hz) / (hz_high - hz_center)
                        };
                        
                        if weight > 0.01 { // Ignore negligible weights
                            bin_indexes.push(i);
                            weights.push(weight);
                        }
                    }
                }
                
                filter_indexes.push(bin_indexes);
                filter_weights.push(weights);
            }
            
            // Create a combined data structure
            let combined_filters: Vec<(Vec<usize>, Vec<f32>)> = 
                filter_indexes.into_iter()
                .zip(filter_weights.into_iter())
                .collect();

            // Assign the correctly structured data to filter_bank
            *filter_bank = Some((sample_rate, combined_filters));
        }
        
        filter_bank.clone().unwrap()
    });
    
    // Get the combined filters vector
    let (_, combined_filters) = filter_bank;

    // Then use them in your processing loop
    for j in 0..num_mel_bins {
        let mut energy = 0.0;
        let mut count = 0;
        
        // Access the tuple for this mel bin
        let (bin_indexes, weights) = &combined_filters[j];
        
        // Process using these values
        for k in 0..bin_indexes.len() {
            let i = bin_indexes[k];
            let value = data_array[i];
            
            if value > NOISE_GATE_THRESHOLD as u8 {
                energy += value as f32 * weights[k];
                count += 1;
            }
        }
        
        // Store the result in mel_data
        if count > 0 {
            mel_data[j] = energy / count as f32;
        }
    }
    
    // Apply frequency-dependent processing
    for i in 0..num_mel_bins {
        // Get the base value
        let mut value = mel_data[i];
        
        // Apply A-weighting
        if USE_A_WEIGHTING {
            // Calculate the center frequency for this specific bin
            let min_freq: f32 = 20.0;
            let max_freq: f32 = sample_rate / 2.0;
            let min_mel = 2595.0 * (1.0 + min_freq / 700.0).log10();
            let max_mel = 2595.0 * (1.0 + max_freq / 700.0).log10();
            
            // Calculate the mel value for this bin
            let mel = min_mel + (max_mel - min_mel) * ((i + 1) as f32 / (num_mel_bins + 1) as f32);
            
            // Convert mel to Hz
            let center_freq = 700.0 * (10.0_f32.powf(mel / 2595.0) - 1.0);
            
            // Simplified A-weighting for performance
            let f2 = center_freq * center_freq;
            let ra = (f2 + 20.6_f32.powi(2)) * 
                   ((f2 + 107.7_f32.powi(2)) * (f2 + 737.9_f32.powi(2))).sqrt() * 
                   (f2 + 12194.0_f32.powi(2));
            
            let weight = ((12194.0_f32.powi(2) * f2 * f2) / ra).max(0.05);
            value *= weight;
        }
        
        // Apply low/high frequency attenuation
        if i < num_mel_bins / 8 {
            value *= LOW_FREQ_ATTENUATION + 
                    (1.0 - LOW_FREQ_ATTENUATION) * (i as f32 / (num_mel_bins / 8) as f32);
        } else if i > num_mel_bins * 3/4 {
            let position = (i - (num_mel_bins * 3/4)) as f32 / (num_mel_bins / 4) as f32;
            value *= 1.0 - (1.0 - HIGH_FREQ_ATTENUATION) * position;
        }
        
        mel_data[i] = value.clamp(0.0, 255.0);
    }
    
    // Apply spline interpolation if enabled (but use the optimized version)
    if USE_SPLINE_INTERPOLATION {
        mel_data = apply_cubic_spline_interpolation(&mel_data);
    }
    
    // Convert to bytes
    mel_data.iter().map(|&v| v as u8).collect()
}


/// Converts linear frequency data to logarithmic bins for better psychoacoustic representation.
/// 
/// Human hearing perception is roughly logarithmic - we perceive the difference between
/// 100Hz and 200Hz as approximately the same as the difference between 1000Hz and 2000Hz,
/// even though the actual frequency difference is much larger in the second case.
/// 
/// This function remaps the linear FFT data to logarithmically spaced frequency bins,
/// which better represents how we actually perceive sound.
/// 
/// # Parameters
/// * `data_array` - The raw frequency data from the FFT (linear bins)
/// * `sample_rate` - Sample rate of the audio in Hz
/// * `fft_size` - Size of the FFT window
/// 
/// # Returns
/// A vector of amplitude values in logarithmically spaced frequency bins
fn convert_to_log_spectrogram(data_array: &[u8], sample_rate: f32, fft_size: f32) -> Vec<u8> {
    let num_log_bins: usize = LOG_BINS;
    let min_freq: f32 = 20.0;  // Lower limit of human hearing
    let max_freq: f32 = if FOCUS_FREQUENCY_RANGE {
        (10000.0_f32).min(sample_rate / 2.0)
    } else {
        sample_rate / 2.0
    };
    
    // Use true logarithmic spacing with expanded bin coverage
    let min_log = min_freq.ln();
    let max_log = max_freq.ln();
    let log_step = (max_log - min_log) / (num_log_bins as f32);
    
    // Generate logarithmically spaced frequency points with overlap
    let mut log_freq_points = Vec::with_capacity(num_log_bins + 1);
    for i in 0..=num_log_bins {
        log_freq_points.push((min_log + i as f32 * log_step).exp());
    }
    
    // Initialize arrays for energy accumulation
    let mut log_energies = vec![0.0_f32; num_log_bins];
    let mut bin_counts = vec![0_u32; num_log_bins];
    
    // Calculate energy per bin with proper weighting
    for (i, &value) in data_array.iter().enumerate() {
        if value == 0 { continue; }
        
        let freq_hz = (i as f32 + 0.5) * sample_rate / fft_size;
        if freq_hz < min_freq || freq_hz > max_freq { continue; }
        
        // Find relevant bins with expanded coverage for better continuity
        for j in 0..num_log_bins {
            let lower = if j > 0 { log_freq_points[j-1] } else { min_freq };
            let upper = log_freq_points[j.min(num_log_bins-1)+1];
            
            // Expand bin coverage to create overlap between adjacent bins
            let bin_width = upper - lower;
            let expanded_lower = lower - bin_width * 0.2;
            let expanded_upper = upper + bin_width * 0.2;
            
            if freq_hz >= expanded_lower && freq_hz <= expanded_upper {
                // Calculate weight using a proper window function
                let center = (lower + upper) / 2.0;
                let normalized_distance = (freq_hz - center) / bin_width;
                
                // Apply modified Hann window for weighting
                let weight = 0.5 * (1.0 - (normalized_distance * 2.0).cos()) *
                             (1.0 - normalized_distance.abs() * 1.5).max(0.0);
                
                if weight > 0.0 {
                    log_energies[j] += value as f32 * weight;
                    bin_counts[j] += 1;
                }
            }
        }
    }
    
    // Process the energies into visualization data
    let mut log_data = vec![0.0_f32; num_log_bins];
    
    // Calculate values using industry-standard techniques
    for i in 0..num_log_bins {
        // Convert energy to proper value
        let mut value = if bin_counts[i] > 0 {
            log_energies[i] / bin_counts[i] as f32
        } else {
            0.0
        };
        
        // Apply minimum floor from constant
        if value > 0.0 {
            value = value.max(LOG_SPEC_MIN_VALUE as f32);
        }
        
        // Apply frequency-dependent boost
        let freq_position = i as f32 / num_log_bins as f32;
        let boost_factor = if freq_position < 0.3 {
            1.2  // Low frequencies
        } else if freq_position < 0.7 {
            1.1  // Mid frequencies
        } else {
            1.0 + freq_position * 0.3  // High frequencies
        };
        
        // Apply boost and clamp to max value
        value = (value * boost_factor).clamp(0.0, LOG_SPEC_MAX_VALUE as f32);
        log_data[i] = value;
    }
    
    // Apply gap filling if enabled
    if LOG_SPEC_GAP_FILL {
        log_data = fill_log_spectrogram_gaps(&log_data);
    }
    
    // Apply spline interpolation for smoothness
    if USE_SPLINE_INTERPOLATION {
        log_data = apply_cubic_spline_interpolation(&log_data);
    }
    
    // Convert to bytes
    log_data.iter().map(|&v| v as u8).collect()
}


/// Apply industry-standard normalization to spectrogram data
/// 
/// This function applies several professional audio normalization techniques:
/// 1. dB scaling (logarithmic amplitude which better matches human perception)
/// 2. Noise floor thresholding 
/// 3. Dynamic range compression
/// 4. Visualization scaling
fn apply_smoothing(data: &[u8]) -> Vec<u8> {
    let mut smoothed = vec![0; data.len()];
    
    // First convert to floating point for more precise operations
    let mut data_f32: Vec<f32> = data.iter().map(|&x| x as f32).collect();
    
    // Apply multi-pass smoothing in linear domain
    for _ in 0..SMOOTHING_PASSES {
        // Multiple iterations with adjustable radius
        for _ in 0..SMOOTHING_ITERATIONS {
            let prev_data = data_f32.clone();
            
            for i in 0..data_f32.len() {
                // Base center weight
                let center_weight = 1.0 - SMOOTHING_FACTOR;
                let mut sum = prev_data[i] * center_weight;
                let mut total_weight = center_weight;
                
                // Apply variable radius smoothing
                for radius in 1..=SMOOTHING_RADIUS {
                    // Calculate weight based on distance (closer = higher weight)
                    let radius_weight = SMOOTHING_FACTOR * (1.0 - (radius as f32 / (SMOOTHING_RADIUS + 1) as f32));
                    
                    // Apply different weights based on frequency position
                    let freq_position = i as f32 / data_f32.len() as f32;
                    let freq_factor = if freq_position < 0.2 {
                        // More aggressive smoothing for low frequencies
                        1.2
                    } else if freq_position > 0.8 {
                        // Less aggressive for highest frequencies (maintain detail)
                        0.8 * HIGH_FREQ_ATTENUATION
                    } else {
                        // Standard for mid-range
                        1.0
                    };
                    
                    let effective_weight = radius_weight * freq_factor;
                    
                    // Apply to both sides if within bounds
                    // Fixed syntax issue with proper parentheses
                    for offset in &[-(radius as isize), radius as isize] {
                        let pos = i as isize + offset;
                        if pos >= 0 && pos < data_f32.len() as isize {
                            sum += prev_data[pos as usize] * effective_weight;
                            total_weight += effective_weight;
                        }
                    }
                }
                
                // Calculate smoothed value
                if total_weight > 0.0 {
                    data_f32[i] = sum / total_weight;
                }
            }
        }
    }
    
    // Apply dB domain smoothing for psychoacoustic correctness
    if SMOOTHING_PASSES_DB > 0 {
        // Convert to dB for perceptual smoothing
        let mut db_data: Vec<f32> = data_f32.iter().map(|&x| {
            if x > 1.0 {
                20.0 * x.log10()
            } else {
                -60.0 // dB floor for zero/near-zero values
            }
        }).collect();
        
        // Apply multi-pass dB-domain smoothing
        for _ in 0..SMOOTHING_PASSES_DB {
            for _ in 0..SMOOTHING_ITERATIONS_DB {
                let prev_db = db_data.clone();
                
                for i in 0..db_data.len() {
                    let center_weight = 1.0 - SMOOTHING_FACTOR_DB;
                    let mut sum = prev_db[i] * center_weight;
                    let mut total_weight = center_weight;
                    
                    // Apply smoothing with variable radius
                    for radius in 1..=SMOOTHING_RADIUS_DB {
                        let radius_weight = SMOOTHING_FACTOR_DB * 
                            (1.0 - (radius as f32 / (SMOOTHING_RADIUS_DB + 1) as f32));
                        
                        // Apply to both sides if within bounds
                        // Fixed syntax issue with proper parentheses
                        for offset in &[-(radius as isize), radius as isize] {
                            let pos = i as isize + offset;
                            if pos >= 0 && pos < db_data.len() as isize {
                                sum += prev_db[pos as usize] * radius_weight;
                                total_weight += radius_weight;
                            }
                        }
                    }
                    
                    // Calculate smoothed dB value
                    if total_weight > 0.0 {
                        db_data[i] = sum / total_weight;
                    }
                }
            }
        }
        
        // Convert back to linear
        for i in 0..data_f32.len() {
            data_f32[i] = 10.0_f32.powf(db_data[i] / 20.0);
        }
    }
    
    // Apply frequency-dependent fill-in for lower frequencies
    let low_freq_range = data_f32.len() / 5;  // Just focus on the lowest 20%
    for i in 1..low_freq_range-1 {
        let avg_neighbors = (data_f32[i-1] + data_f32[i+1]) * 0.5;
        // If this point is significantly lower than its neighbors
        if data_f32[i] < avg_neighbors * 0.6 {
            // Fill the valley with at least 40% of the average of neighbors
            data_f32[i] = data_f32[i].max(avg_neighbors * 0.4);
        }
    }
    
    // Convert back to u8
    for i in 0..data_f32.len() {
        smoothed[i] = data_f32[i].clamp(0.0, 255.0) as u8;
    }
    
    smoothed
}

/// Apply cubic spline interpolation to create a smooth continuous curve
fn apply_cubic_spline_interpolation(data: &[f32]) -> Vec<f32> {
    let original_len = data.len();
    let high_res_len = original_len * INTERPOLATION_FACTOR;
    
    let mut interpolated = vec![0.0; high_res_len];
    
    // Pre-compute derivatives once
    let mut derivatives = vec![0.0; original_len];
    
    // Interior points
    for i in 1..original_len-1 {
        derivatives[i] = (data[i+1] - data[i-1]) / 2.0 * (1.0 - SPLINE_TENSION);
    }
    
    // Endpoints
    if original_len > 1 {
        derivatives[0] = (data[1] - data[0]) * (1.0 - SPLINE_TENSION);
        derivatives[original_len-1] = (data[original_len-1] - data[original_len-2]) * (1.0 - SPLINE_TENSION);
    }
    
    // Initial interpolation
    for i in 0..high_res_len {
        let t = i as f32 / high_res_len as f32 * original_len as f32;
        let index = t.floor() as usize;
        let index = index.min(original_len - 2).max(0);
        
        let local_t = t - index as f32;
        
        // Hermite interpolation
        let p0 = data[index];
        let p1 = data[index + 1];
        let m0 = derivatives[index];
        let m1 = derivatives[index + 1];
        
        let h00 = 2.0 * local_t.powi(3) - 3.0 * local_t.powi(2) + 1.0;
        let h10 = local_t.powi(3) - 2.0 * local_t.powi(2) + local_t;
        let h01 = -2.0 * local_t.powi(3) + 3.0 * local_t.powi(2);
        let h11 = local_t.powi(3) - local_t.powi(2);
        
        interpolated[i] = h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
    }
    
    // Apply smoothing passes efficiently
    for _ in 0..SPLINE_PASSES {
        for _ in 0..SPLINE_ITERATIONS {
            let prev_data = interpolated.clone(); // Single clone per iteration
            
            for i in 0..high_res_len {
                let center_weight = 1.0 - (SPLINE_TENSION * 0.5);
                let mut sum = prev_data[i] * center_weight;
                let mut total_weight = center_weight;
                
                for radius in 1..=SPLINE_RADIUS {
                    let radius_weight = (SPLINE_TENSION * 0.5) * 
                        (1.0 - (radius as f32 / (SPLINE_RADIUS + 1) as f32));
                    
                    for offset in &[-(radius as isize), radius as isize] {
                        let pos = i as isize + offset;
                        if pos >= 0 && pos < high_res_len as isize {
                            sum += prev_data[pos as usize] * radius_weight;
                            total_weight += radius_weight;
                        }
                    }
                }
                
                interpolated[i] = sum / total_weight;
            }
        }
    }
    
    // Handle DB processing separately, not within the main loop
    if SPLINE_PASSES_DB > 0 {
        // Process in dB domain for final result
        let mut db_data = interpolated.iter().map(|&x| {
            if x > 1.0 { 20.0 * x.log10() } else { -60.0 }
        }).collect::<Vec<f32>>();
        
        // Apply dB domain smoothing
        for _ in 0..SPLINE_PASSES_DB {
            for _ in 0..SPLINE_ITERATIONS_DB {
                let prev_db = db_data.clone();
                
                for i in 0..high_res_len {
                    // Similar smoothing logic but for dB values
                    let center_weight = 1.0 - SPLINE_TENSION_DB;
                    let mut sum = prev_db[i] * center_weight;
                    let mut total_weight = center_weight;
                    
                    for radius in 1..=SPLINE_RADIUS_DB {
                        let radius_weight = SPLINE_TENSION_DB * 
                            (1.0 - (radius as f32 / (SPLINE_RADIUS_DB + 1) as f32));
                        
                        for offset in &[-(radius as isize), radius as isize] {
                            let pos = i as isize + offset;
                            if pos >= 0 && pos < high_res_len as isize {
                                sum += prev_db[pos as usize] * radius_weight;
                                total_weight += radius_weight;
                            }
                        }
                    }
                    
                    db_data[i] = sum / total_weight;
                }
            }
        }
        
        // Convert back to linear domain
        for i in 0..high_res_len {
            interpolated[i] = 10.0_f32.powf(db_data[i] / 20.0);
        }
    }
    
    // Downsample to original resolution
    let mut result = vec![0.0; original_len];
    let step = high_res_len as f32 / original_len as f32;
    
    for i in 0..original_len {
        let exact_pos = i as f32 * step;
        let pos_floor = exact_pos.floor() as usize;
        let pos_ceil = (pos_floor + 1).min(high_res_len - 1);
        let t = exact_pos - pos_floor as f32;
        
        result[i] = interpolated[pos_floor] * (1.0 - t) + interpolated[pos_ceil] * t;
    }
    
    result
}

// Special function to specifically address gaps in log spectrogram
// fn fill_log_spectrogram_gaps(data: &[f32]) -> Vec<f32> {
//     let mut filled = data.to_vec();
//     let len = data.len();
    
//     // Define thresholds using constants instead of hardcoded values
//     let activity_threshold = LOG_SPEC_GAP_THRESHOLD as f32; // Use constant for activity detection
//     let significant_value = LOG_SPEC_GAP_THRESHOLD as f32 * 2.0; // Higher threshold for significant peaks
//     let minimal_value = LOG_SPEC_MIN_VALUE as f32 * 0.5; // Minimum floor for all bins
//     let max_gap_size = 15; // Maximum gap size to fill (could be made into a constant)
    
//     // First pass: identify "islands" of activity and gaps between them
//     let mut islands: Vec<(usize, usize)> = Vec::new();
//     let mut start = None;
    
//     // Find regions of activity (islands)
//     for i in 0..len {
//         if data[i] > activity_threshold && start.is_none() {
//             // Start of a new island
//             start = Some(i);
//         } else if data[i] <= activity_threshold && start.is_some() {
//             // End of an island
//             islands.push((start.unwrap(), i - 1));
//             start = None;
//         }
//     }
    
//     // Don't forget the last island if it extends to the end
//     if let Some(s) = start {
//         islands.push((s, len - 1));
//     }
    
//     // Second pass: fill in gaps between islands using standardized gap filling factor
//     for i in 0..islands.len().saturating_sub(1) {
//         let (_, end_first) = islands[i];
//         let (start_second, _) = islands[i + 1];
        
//         let gap_size = start_second - end_first - 1;
        
//         // Only fill relatively small gaps
//         if gap_size > 0 && gap_size < max_gap_size {
//             // Use linear interpolation to fill the gap
//             let left_value = data[end_first];
//             let right_value = data[start_second];
            
//             for j in 1..=gap_size {
//                 let pos = end_first + j;
//                 let t = j as f32 / (gap_size + 1) as f32;
                
//                 // Linear interpolation with industry-standard scaling factor
//                 let interp_value = left_value * (1.0 - t) + right_value * t;
//                 filled[pos] = interp_value * LOG_SPEC_GAP_FILL_FACTOR;
//             }
//         }
//     }
    
//     // Third pass: ensure minimum values around active bins within radius
//     for i in LOG_SPEC_GAP_RADIUS..len.saturating_sub(LOG_SPEC_GAP_RADIUS) {
//         if filled[i] > significant_value {
//             // Apply to neighbors within defined radius
//             for offset in 1..=LOG_SPEC_GAP_RADIUS as isize {
//                 // Process neighbors on both sides
//                 for j in [i as isize - offset, i as isize + offset] {
//                     if j >= 0 && j < len as isize {
//                         let j_idx = j as usize;
//                         // Only modify if current value is below minimal threshold
//                         if filled[j_idx] < minimal_value {
//                             // Scale based on distance from center (farther = less influence)
//                             let distance_factor = 1.0 - (offset as f32 / (LOG_SPEC_GAP_RADIUS + 1) as f32);
//                             let min_neighbor_value = filled[i] * LOG_SPEC_GAP_FILL_FACTOR * distance_factor;
//                             filled[j_idx] = filled[j_idx].max(min_neighbor_value);
//                         }
//                     }
//                 }
//             }
//         }
//     }
    
//     // Apply minimum floor across entire spectrum to avoid complete silence
//     for i in 0..len {
//         if filled[i] < LOG_SPEC_MIN_VALUE as f32 * 0.1 {
//             // Use a small fraction of minimum value as absolute floor
//             filled[i] = filled[i].max(LOG_SPEC_MIN_VALUE as f32 * 0.1);
//         }
//     }
    
//     filled
// }

//similfied version of the function
fn fill_log_spectrogram_gaps(data: &[f32]) -> Vec<f32> {
    let mut filled = data.to_vec();
    
    // Simplify to a single pass with basic interpolation
    for i in 1..data.len()-1 {
        if data[i] < LOG_SPEC_MIN_VALUE as f32 * 0.5 && 
           (data[i-1] > LOG_SPEC_GAP_THRESHOLD as f32 || data[i+1] > LOG_SPEC_GAP_THRESHOLD as f32) {
            filled[i] = (data[i-1] + data[i+1]) * 0.4; // Simple interpolation
        }
    }
    
    filled
}


/// Apply industry-standard normalization to spectrogram data
/// 
/// This function applies several professional audio normalization techniques:
/// 1. dB scaling (logarithmic amplitude which better matches human perception)
/// 2. Noise floor thresholding 
/// 3. Dynamic range compression
/// 4. Visualization scaling
fn normalize_spectrogram(raw_data: &[u8]) -> Vec<u8> {
    // Keep your existing code, but add this section at the beginning:
    
    let use_log = USE_LOG_SPECTROGRAM.load(Ordering::SeqCst);
    let mut normalized = Vec::with_capacity(raw_data.len());
    
    // Apply frequency-dependent noise gating to reduce bass dominance
    // This is an industry standard technique
    let silence_threshold = if use_log { 3 } else { 5 };
    
    // Find the max value across all bands 
    let max_value = raw_data.iter()
        .fold(1u8, |max, &val| max.max(val)) as f64;
    
    // Only apply strong processing if the overall level is low
    // (industry standard approach - only process heavily during quiet passages)
    let is_quiet_passage = max_value < 50.0;
    
    for (i, &sample) in raw_data.iter().enumerate() {
        let freq_position = i as f64 / raw_data.len() as f64;
        
        // Apply stricter thresholds to lower frequencies
        // Industry standard: bass needs higher thresholds to avoid noise dominance
        let band_threshold = if freq_position < 0.2 {
            // Low frequencies (bass) - higher threshold
            if is_quiet_passage {
                silence_threshold * 3  // Even stricter during quiet passages
            } else {
                silence_threshold * 2
            }
        } else if freq_position < 0.4 {
            // Low-mid frequencies - moderate threshold
            silence_threshold + 1
        } else {
            // Mid and high frequencies - standard threshold
            silence_threshold
        };
        
        // Apply the threshold
        let gated_value = if sample <= band_threshold {
            0
        } else {
            sample
        };
        
        // Continue with your existing normalization pipeline using gated_value
        
        // For now, just use this value (replace with your full processing)
        normalized.push(gated_value);
    }
    
    // Rest of your normalization code follows...
    normalized
}

fn process_audio_data(data: &[u8], output: &mut [u8], sample_rate: f32, fft_size: f32) {
    // Choose which spectrogram to use
    let raw_data = if USE_LOG_SPECTROGRAM.load(Ordering::SeqCst) {
        convert_to_log_spectrogram(data, sample_rate, fft_size)
    } else {
        convert_to_mel_spectrogram(data, sample_rate, fft_size)
    };
    
    // Apply smoothing and normalization
    let processed = if USE_SMOOTHING {
        apply_smoothing(&raw_data)
    } else {
        raw_data
    };
    
    // Apply final normalization
    let result = normalize_spectrogram(&processed);
    
    // Copy to the pre-allocated output buffer
    output.copy_from_slice(&result);
}

// Helper function for debug logging
fn debug_log(message: &str) {
    if DEBUG.load(Ordering::SeqCst) {
        // Add timestamp for better tracking 
        let timestamp = js_sys::Date::now();
        console::log_1(&JsValue::from_str(&format!("[{:.2}ms] {}", timestamp % 10000.0, message)));
    }
}
```

## File: ../../../../../opt/caddy/html/reveal/public/wasm_input_reflect/Cargo.lock <a id="file-cargo-lock"></a>

```
# This file is automatically @generated by Cargo.
# It is not intended for manual editing.
version = 4

[[package]]
name = "bumpalo"
version = "3.17.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1628fb46dfa0b37568d12e5edd512553eccf6a22a78e8bde00bb4aed84d5bdbf"

[[package]]
name = "cfg-if"
version = "1.0.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "baf1de4339761588bc0619e3cbc0120ee582ebb74b53b4efbf79117bd2da40fd"

[[package]]
name = "js-sys"
version = "0.3.77"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1cfaf33c695fc6e08064efbc1f72ec937429614f25eef83af942d0e227c3a28f"
dependencies = [
 "once_cell",
 "wasm-bindgen",
]

[[package]]
name = "log"
version = "0.4.26"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "30bde2b3dc3671ae49d8e2e9f044c7c005836e7a023ee57cffa25ab82764bb9e"

[[package]]
name = "once_cell"
version = "1.20.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "945462a4b81e43c4e3ba96bd7b49d834c6f61198356aa858733bc4acf3cbe62e"

[[package]]
name = "proc-macro2"
version = "1.0.94"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "a31971752e70b8b2686d7e46ec17fb38dad4051d94024c88df49b667caea9c84"
dependencies = [
 "unicode-ident",
]

[[package]]
name = "quote"
version = "1.0.39"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c1f1914ce909e1658d9907913b4b91947430c7d9be598b15a1912935b8c04801"
dependencies = [
 "proc-macro2",
]

[[package]]
name = "rustversion"
version = "1.0.20"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "eded382c5f5f786b989652c49544c4877d9f015cc22e145a5ea8ea66c2921cd2"

[[package]]
name = "syn"
version = "2.0.99"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e02e925281e18ffd9d640e234264753c43edc62d64b2d4cf898f1bc5e75f3fc2"
dependencies = [
 "proc-macro2",
 "quote",
 "unicode-ident",
]

[[package]]
name = "unicode-ident"
version = "1.0.18"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "5a5f39404a5da50712a4c1eecf25e90dd62b613502b7e925fd4e4d19b5c96512"

[[package]]
name = "wasm-bindgen"
version = "0.2.100"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1edc8929d7499fc4e8f0be2262a241556cfc54a0bea223790e71446f2aab1ef5"
dependencies = [
 "cfg-if",
 "once_cell",
 "rustversion",
 "wasm-bindgen-macro",
]

[[package]]
name = "wasm-bindgen-backend"
version = "0.2.100"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "2f0a0651a5c2bc21487bde11ee802ccaf4c51935d0d3d42a6101f98161700bc6"
dependencies = [
 "bumpalo",
 "log",
 "proc-macro2",
 "quote",
 "syn",
 "wasm-bindgen-shared",
]

[[package]]
name = "wasm-bindgen-macro"
version = "0.2.100"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7fe63fc6d09ed3792bd0897b314f53de8e16568c2b3f7982f468c0bf9bd0b407"
dependencies = [
 "quote",
 "wasm-bindgen-macro-support",
]

[[package]]
name = "wasm-bindgen-macro-support"
version = "0.2.100"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "8ae87ea40c9f689fc23f209965b6fb8a99ad69aeeb0231408be24920604395de"
dependencies = [
 "proc-macro2",
 "quote",
 "syn",
 "wasm-bindgen-backend",
 "wasm-bindgen-shared",
]

[[package]]
name = "wasm-bindgen-shared"
version = "0.2.100"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1a05d73b933a847d6cccdda8f838a22ff101ad9bf93e33684f39c1f5f0eece3d"
dependencies = [
 "unicode-ident",
]

[[package]]
name = "wasm_input_reflect"
version = "0.1.0"
dependencies = [
 "wasm-bindgen",
 "web-sys",
]

[[package]]
name = "web-sys"
version = "0.3.77"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "33b6dd2ef9186f1f2072e409e99cd22a975331a6b3591b12c764e0e55c60d5d2"
dependencies = [
 "js-sys",
 "wasm-bindgen",
]

```