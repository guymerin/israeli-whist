import UIKit
import Capacitor
import StoreKit

// The native half of the "rate this game" ask. The web layer (script.js,
// maybeAskForRating) calls it after the player wins a full game; everything
// about *when* to ask lives there, and this side only does the asking.
//
// The system decides whether a prompt is actually drawn — App Store rules cap
// it at three a year per user and ignore the rest — so `request` resolving is
// not a promise that anything appeared, and there is deliberately no way for
// the web layer to tell. It must never gate gameplay on the answer.
@objc(ReviewPromptPlugin)
public class ReviewPromptPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ReviewPromptPlugin"
    public let jsName = "ReviewPrompt"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "request", returnType: CAPPluginReturnPromise)
    ]

    @objc func request(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            // Both APIs want the window scene the app is showing in — on iPad
            // and on a Mac there can be more than one, and the prompt belongs
            // to the one the game is in.
            guard let scene = self.bridge?.viewController?.view.window?.windowScene else {
                call.resolve(["requested": false])
                return
            }
            if #available(iOS 16.0, *) {
                AppStore.requestReview(in: scene)
            } else {
                SKStoreReviewController.requestReview(in: scene)
            }
            call.resolve(["requested": true])
        }
    }
}

// Capacitor 8 registers plugins from the `packageClassList` that `cap sync`
// generates out of the installed npm packages (CapacitorBridge.registerPlugins),
// so a plugin that lives in this app and not in a package is never picked up on
// its own. `capacitorDidLoad()` is the hook for exactly that, and the storyboard
// points its root view controller here instead of at CAPBridgeViewController so
// this runs. Registering an instance also injects the JS side, which is what
// makes `window.Capacitor.Plugins.ReviewPrompt` exist.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(ReviewPromptPlugin())
    }
}
