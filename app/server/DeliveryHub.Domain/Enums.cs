namespace DeliveryHub.Domain;

public enum PersonType
{
    FullTime,
    PartTime,
    Contract,
    Intern
}

public enum PersonStatus
{
    Active,
    OnLeave,
    SickLeave,
    NoticePeriod
}

public enum ProjectState
{
    Active,
    Backlog,
    Completed
}

public enum LoadBand
{
    Available,
    PartiallyAvailable,
    FullyAllocated,
    OverAllocated
}

public enum SkillMatchLevel
{
    None,
    Partial,
    Full
}
