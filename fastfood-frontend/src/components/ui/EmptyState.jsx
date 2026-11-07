/**
 * EmptyState — friendly placeholder shown when a list/resource is empty.
 * icon:   emoji or short text
 * title:  bold heading
 * message: supporting copy
 * action: optional React node (e.g. a button) for recovery
 */
export default function EmptyState({ icon = "🍽️", title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 animate-fade-in">
      <div className="text-6xl mb-4 select-none">{icon}</div>
      <h3 className="text-xl font-bold text-gray-800">{title}</h3>
      {message && <p className="text-gray-500 mt-1 max-w-sm">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
