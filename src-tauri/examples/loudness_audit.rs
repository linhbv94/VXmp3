// Read-only diagnosis; never writes audio files.
use vx_mp3_lib::audio_core::{measure_audio_file, preflight_check_mp3_gain, calculate_gain_steps};
fn main() {
    for path in std::env::args().skip(1) {
        let started = std::time::Instant::now();
        let result = match measure_audio_file(&path, 89.0) {
            Ok(m) => { let steps = calculate_gain_steps(m.measured_db_spl, 89.0);
                serde_json::json!({"file":std::path::Path::new(&path).file_name().unwrap().to_string_lossy(),"db":m.measured_db_spl,"peak":m.measured_true_peak_dbtp,"requested_steps":steps,"preflight":format!("{:?}", preflight_check_mp3_gain(std::path::Path::new(&path),steps))}) },
            Err(e) => serde_json::json!({"file":path,"error":e}),
        };
        println!("{}",serde_json::json!({"result":result,"elapsed_ms":started.elapsed().as_millis(),"debug_assertions":cfg!(debug_assertions)}));
    }
}
