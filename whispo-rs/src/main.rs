use rdev::{listen, Event, EventType};
use serde::Serialize;
use serde_json::json;
use std::time::SystemTime;

#[cfg(feature = "wayland")]
use ashpd::desktop::global_shortcuts::{GlobalShortcuts, NewShortcut};
#[cfg(feature = "wayland")]
use futures_util::StreamExt;

#[derive(Serialize)]
struct RdevEvent {
    event_type: String,
    name: Option<String>,
    time: std::time::SystemTime,
    data: String,
}

fn deal_event_to_json(event: Event) -> RdevEvent {
    let mut jsonify_event = RdevEvent {
        event_type: "".to_string(),
        name: event.name,
        time: event.time,
        data: "".to_string(),
    };
    match event.event_type {
        EventType::KeyPress(key) => {
            jsonify_event.event_type = "KeyPress".to_string();
            jsonify_event.data = json!({
                "key": format!("{:?}", key)
            })
            .to_string();
        }
        EventType::KeyRelease(key) => {
            jsonify_event.event_type = "KeyRelease".to_string();
            jsonify_event.data = json!({
                "key": format!("{:?}", key)
            })
            .to_string();
        }
        EventType::MouseMove { x, y } => {
            jsonify_event.event_type = "MouseMove".to_string();
            jsonify_event.data = json!({
                "x": x,
                "y": y
            })
            .to_string();
        }
        EventType::ButtonPress(key) => {
            jsonify_event.event_type = "ButtonPress".to_string();
            jsonify_event.data = json!({
                "key": format!("{:?}", key)
            })
            .to_string();
        }
        EventType::ButtonRelease(key) => {
            jsonify_event.event_type = "ButtonRelease".to_string();
            jsonify_event.data = json!({
                "key": format!("{:?}", key)
            })
            .to_string();
        }
        EventType::Wheel { delta_x, delta_y } => {
            jsonify_event.event_type = "Wheel".to_string();
            jsonify_event.data = json!({
                "delta_x": delta_x,
                "delta_y": delta_y
            })
            .to_string();
        }
    }

    jsonify_event
}

fn write_text(text: &str) {
    use enigo::{Enigo, Keyboard, Settings};

    let mut enigo = Enigo::new(&Settings::default()).unwrap();

    // write text
    enigo.text(text).unwrap();
}

#[cfg(feature = "wayland")]
async fn listen_wayland() -> Result<(), Box<dyn std::error::Error>> {
    let shortcuts = GlobalShortcuts::new().await?;
    let session = shortcuts.create_session().await?;
    let request = shortcuts
        .bind_shortcuts(
            &session,
            &[NewShortcut::new("toggle", "Toggle recording").preferred_trigger("F8")],
            None,
        )
        .await?;
    request.response()?;

    let mut activated = shortcuts.receive_activated().await?;
    let mut deactivated = shortcuts.receive_deactivated().await?;

    loop {
        tokio::select! {
            Some(_a) = activated.next() => {
                let event = RdevEvent {
                    event_type: "KeyPress".to_string(),
                    name: None,
                    time: SystemTime::now(),
                    data: json!({"key": "F8"}).to_string(),
                };
                println!("{}", serde_json::to_string(&event).unwrap());
            },
            Some(_d) = deactivated.next() => {
                let event = RdevEvent {
                    event_type: "KeyRelease".to_string(),
                    name: None,
                    time: SystemTime::now(),
                    data: json!({"key": "F8"}).to_string(),
                };
                println!("{}", serde_json::to_string(&event).unwrap());
            },
        }
    }
}

fn main() {
    let args: Vec<String> = std::env::args().collect();

    if args.len() > 1 && args[1] == "listen" {
        let use_wayland = std::env::var("XDG_SESSION_TYPE").map(|v| v == "wayland").unwrap_or(false)
            || std::env::var("WAYLAND_DISPLAY").is_ok();

        if use_wayland {
            #[cfg(feature = "wayland")]
            {
                let rt = tokio::runtime::Builder::new_current_thread()
                    .enable_all()
                    .build()
                    .unwrap();
                if let Err(e) = rt.block_on(listen_wayland()) {
                    eprintln!("wayland listen error: {:?}", e);
                }
            }
            #[cfg(not(feature = "wayland"))]
            {
                eprintln!("wayland feature not enabled");
            }
        } else if let Err(error) = listen(move |event| match event.event_type {
            EventType::KeyPress(_) | EventType::KeyRelease(_) => {
                let event = deal_event_to_json(event);
                println!("{}", serde_json::to_string(&event).unwrap());
            }

            _ => {}
        }) {
            println!("!error: {:?}", error);
        }
    }

    if args.len() > 2 && args[1] == "write" {
        let text = args[2].clone();
        write_text(text.as_str());
    }
}
