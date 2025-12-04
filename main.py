import re
from typing import List, Dict, Tuple


class Issue:
    """Represents a single issue ticket"""
    def __init__(self, ticket_id: str, title: str, reporter: str, priority: str, 
                 description: str, impact: str = ""):
        self.ticket_id = ticket_id
        self.title = title
        self.reporter = reporter
        self.priority = priority
        self.description = description
        self.impact = impact
    
    def __str__(self):
        return f"[{self.ticket_id}] {self.title} (Priority: {self.priority})"
    
    def full_details(self):
        return f"""
{'='*60}
Ticket: {self.ticket_id}
Title: {self.title}
Reporter: {self.reporter}
Priority: {self.priority}
Description: {self.description}
Impact: {self.impact}
{'='*60}
"""


def load_reported_issues(file_path='data/reported_issues.txt') -> List[Issue]:
    """Parse reported_issues.txt and convert to Issue objects"""
    issues = []
    try:
        with open(file_path, 'r') as file:
            content = file.read()
    except FileNotFoundError:
        print(f"The file {file_path} does not exist.")
        return issues
    
    # Split by ticket patterns (Ticket XXX-YYY:)
    ticket_pattern = r'Ticket\s+([A-Z]+-\d+):\s*(.+?)(?=Ticket|\Z)'
    matches = re.finditer(ticket_pattern, content, re.DOTALL)
    
    for match in matches:
        ticket_id = match.group(1)
        ticket_content = match.group(0)
        
        # Extract fields
        title_match = re.search(r'Ticket\s+[A-Z]+-\d+:\s*(.+?)(?:\n|$)', ticket_content)
        title = title_match.group(1).strip() if title_match else "Unknown"
        
        reporter_match = re.search(r'Reporter:\s*(.+?)(?:\n|$)', ticket_content)
        reporter = reporter_match.group(1).strip() if reporter_match else "Unknown"
        
        priority_match = re.search(r'Priority:\s*(\w+)', ticket_content)
        priority = priority_match.group(1).strip() if priority_match else "Medium"
        
        description_match = re.search(r'Description:\s*["\']?(.+?)(?:\n(?:Steps|Examples|Impact|Expected)|$)', 
                                     ticket_content, re.DOTALL)
        description = description_match.group(1).strip().strip('"\'') if description_match else "No description"
        
        impact_match = re.search(r'Impact:\s*(.+?)(?:\n|$)', ticket_content)
        impact = impact_match.group(1).strip() if impact_match else ""
        
        issues.append(Issue(ticket_id, title, reporter, priority, description, impact))
    
    return issues


def prioritize_issues(issues: List[Issue]) -> List[Issue]:
    """Sort issues by priority (Critical > High > Medium > Low)"""
    priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
    
    return sorted(issues, key=lambda x: priority_order.get(x.priority.lower(), 4))


def categorize_issues(issues: List[Issue]) -> Dict[str, List[Issue]]:
    """Group issues by category (UI, Validation, Security, Logic/Performance)"""
    categories = {
        'UI Issues': [],
        'Validation Issues': [],
        'Security Issues': [],
        'Logic & Performance': []
    }
    
    for issue in issues:
        if issue.ticket_id.startswith('UI'):
            categories['UI Issues'].append(issue)
        elif issue.ticket_id.startswith('VAL'):
            categories['Validation Issues'].append(issue)
        elif issue.ticket_id.startswith('SEC'):
            categories['Security Issues'].append(issue)
        elif issue.ticket_id.startswith('PERF'):
            categories['Logic & Performance'].append(issue)
    
    return categories


def display_issue(issue: Issue) -> None:
    """Display a single issue in detail"""
    print(issue.full_details())


def get_next_issue(issues: List[Issue], current_index: int) -> Tuple[Issue, int]:
    """Get the next issue to work on"""
    if current_index < len(issues):
        return issues[current_index], current_index + 1
    return None, current_index


def print_summary(issues: List[Issue]) -> None:
    """Print a summary of all issues by category and priority"""
    categories = categorize_issues(issues)
    
    print("\n" + "="*60)
    print("ISSUE SUMMARY BY CATEGORY")
    print("="*60)
    
    for category, cat_issues in categories.items():
        if cat_issues:
            print(f"\n{category} ({len(cat_issues)} issues):")
            for issue in cat_issues:
                print(f"  • {issue}")


def main():
    """Main entry point for issue management"""
    print("SecureBank Issue Tracker - Starting Investigation")
    print("="*60)
    
    # Load and process issues
    all_issues = load_reported_issues('data/reported_issues.txt')
    
    if not all_issues:
        print("No issues found. Exiting.")
        return
    
    # Sort by priority
    prioritized_issues = prioritize_issues(all_issues)
    
    # Display summary
    print_summary(prioritized_issues)
    
    # Interactive issue navigation
    print("\n" + "="*60)
    print(f"Total Issues: {len(prioritized_issues)}")
    print("="*60)
    
    current_index = 0
    
    while True:
        issue, current_index = get_next_issue(prioritized_issues, current_index)
        
        if not issue:
            print("\nAll issues reviewed!")
            break
        
        display_issue(issue)
        
        user_input = input("\nPress 'n' for next issue, 'q' to quit, or 'l' to list all: ").strip().lower()
        
        if user_input == 'q':
            print("Exiting...")
            break
        elif user_input == 'l':
            print_summary(prioritized_issues)
        elif user_input != 'n':
            print("Invalid input. Moving to next issue...")


if __name__ == "__main__":
    main()