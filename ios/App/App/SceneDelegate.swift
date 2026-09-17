import UIKit
import Capacitor

// iOS 26 and later hard-crash on launch if an app linked against the new SDK
// has not adopted the UIScene lifecycle
// (_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption). This class
// plus the UIApplicationSceneManifest entry in Info.plist is that adoption.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let window = UIWindow(windowScene: windowScene)
        window.rootViewController = UIStoryboard(name: "Main", bundle: nil).instantiateInitialViewController()
        self.window = window

        // Some Capacitor plugins still reach for UIApplication.shared.delegate?.window,
        // so keep the AppDelegate's reference pointing at the scene's window.
        (UIApplication.shared.delegate as? AppDelegate)?.window = window

        window.makeKeyAndVisible()

        // Under the scene lifecycle the AppDelegate's open-url / continue-activity
        // callbacks are no longer invoked, so hand launch-time ones over here.
        for context in connectionOptions.urlContexts {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: context.url, options: openURLOptions(for: context))
        }
        for userActivity in connectionOptions.userActivities {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        for context in URLContexts {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: context.url, options: openURLOptions(for: context))
        }
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }

    private func openURLOptions(for context: UIOpenURLContext) -> [UIApplication.OpenURLOptionsKey: Any] {
        var options: [UIApplication.OpenURLOptionsKey: Any] = [
            .openInPlace: context.options.openInPlace
        ]
        if let source = context.options.sourceApplication {
            options[.sourceApplication] = source
        }
        if let annotation = context.options.annotation {
            options[.annotation] = annotation
        }
        return options
    }
}
